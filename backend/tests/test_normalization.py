"""
Tests for Universal Medical Normalization Engine
"""

import pytest
from app.core.normalization.engine import UniversalMedicalNormalizationEngine as Normalizer

def test_unit_normalization_glucose():
    # 126 mg/dL to mmol/L (standard diabetic threshold)
    res = Normalizer.normalize_unit(126.0, "mg/dL", "mmol/L", analyte_key="glucose")
    assert res["converted"] is True
    assert res["normalized_value"] == 7.0  # 126 / 18.0182 = 6.992 ~ 7.0
    assert "Molecular Weight of D-Glucose" in res["formula"]

    # 7.0 mmol/L back to mg/dL
    res_back = Normalizer.normalize_unit(7.0, "mmol/L", "mg/dL", analyte_key="glucose")
    assert res_back["converted"] is True
    assert round(res_back["normalized_value"]) == 126

def test_unit_normalization_anthropometrics():
    # Weight kg to lb
    res_wt = Normalizer.normalize_unit(70.0, "kg", "lb")
    assert res_wt["converted"] is True
    assert round(res_wt["normalized_value"], 1) == 154.3

    # Height cm to inches
    res_ht = Normalizer.normalize_unit(178.0, "cm", "inches")
    assert res_ht["converted"] is True
    assert round(res_ht["normalized_value"], 1) == 70.1

    # Temperature C to F
    res_temp = Normalizer.normalize_unit(37.0, "°C", "°F")
    assert res_temp["converted"] is True
    assert res_temp["normalized_value"] == 98.6

def test_multilingual_concept_normalization():
    # Hindi
    res_hi = Normalizer.normalize_clinical_term("फास्टिंग ब्लड शुगर")
    assert res_hi["standardized"] is True
    assert res_hi["loinc"] == "1558-6"
    assert "Fasting Blood Glucose" in res_hi["canonical_name"]

    # German
    res_de = Normalizer.normalize_clinical_term("Nüchternblutzucker")
    assert res_de["standardized"] is True
    assert res_de["loinc"] == "1558-6"

    # Vernacular English
    res_en = Normalizer.normalize_clinical_term("blood sugar")
    assert res_en["standardized"] is True
    assert res_en["loinc"] == "1558-6"

def test_paracetamol_acetaminophen_equivalency():
    res = Normalizer.normalize_clinical_term("Crocin 650mg")
    assert res["standardized"] is True
    assert res["canonical_name"] == "Paracetamol (Crocin)"
    assert res["rxnorm_cui"] == "161"

def test_date_disambiguation():
    # Context India (DD/MM/YYYY)
    d_in = Normalizer.normalize_date("05/12/2024", country_context="IN")
    assert d_in["normalized_iso_date"] == "2024-12-05"

    # Context US (MM/DD/YYYY)
    d_us = Normalizer.normalize_date("05/12/2024", country_context="US")
    assert d_us["normalized_iso_date"] == "2024-05-12"

    # Deterministic day > 12
    d_det = Normalizer.normalize_date("22/07/2024", country_context="US")
    assert d_det["normalized_iso_date"] == "2024-07-22"

def test_region_aware_lab_discrepancy():
    # 126 mg/dL glucose
    interp = Normalizer.interpret_lab_result(
        test_key="glucose_fasting",
        value=126.0,
        unit="mg/dL",
        origin_country="IN",
        destination_country="GB"
    )
    assert interp["has_regional_discrepancy"] is True
    assert interp["normalized_value"] == 7.0
    assert interp["normalized_unit"] == "mmol/L"
    assert "Reference intervals differ by region" in interp["discrepancy_explanation"]
