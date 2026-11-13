"""
Universal Medical Normalization Engine - Clinical Constants & Interoperability Standards
Covers international units, country profiles, multilinqual clinical mappings, LOINC/RxNorm ontology,
and regional laboratory reference interval discrepancies.
"""

from typing import Dict, Any, List

# Country Metadata and Regional Preferences
COUNTRY_PROFILES: Dict[str, Dict[str, Any]] = {
    "IN": {
        "code": "IN",
        "name": "India",
        "flag": "🇮🇳",
        "preferred_units": {
            "glucose": "mg/dL",
            "cholesterol": "mg/dL",
            "hemoglobin": "g/dL",
            "creatinine": "mg/dL",
            "weight": "kg",
            "height": "cm",
            "temperature": "°C",
            "blood_pressure": "mmHg",
        },
        "date_format": "DD/MM/YYYY",
        "date_regex_order": ("day", "month", "year"),
        "primary_languages": ["en", "hi", "bn", "ta", "te", "mr", "gu"],
        "emergency_number": "112",
        "ambulance_number": "108",
        "national_guidelines_body": "Indian Council of Medical Research (ICMR) & NABL",
        "typical_labs": ["Dr Lal PathLabs", "Apollo Diagnostics", "Metropolis Healthcare", "SRL Diagnostics"],
        "currency": "INR (₹)",
    },
    "US": {
        "code": "US",
        "name": "United States",
        "flag": "🇺🇸",
        "preferred_units": {
            "glucose": "mg/dL",
            "cholesterol": "mg/dL",
            "hemoglobin": "g/dL",
            "creatinine": "mg/dL",
            "weight": "lb",
            "height": "inches",
            "temperature": "°F",
            "blood_pressure": "mmHg",
        },
        "date_format": "MM/DD/YYYY",
        "date_regex_order": ("month", "day", "year"),
        "primary_languages": ["en", "es"],
        "emergency_number": "911",
        "ambulance_number": "911",
        "national_guidelines_body": "Clinical Laboratory Improvement Amendments (CLIA) / ADA / AHA",
        "typical_labs": ["Quest Diagnostics", "Labcorp", "Mayo Clinic Laboratories", "BioReference"],
        "currency": "USD ($)",
    },
    "GB": {
        "code": "GB",
        "name": "United Kingdom",
        "flag": "🇬🇧",
        "preferred_units": {
            "glucose": "mmol/L",
            "cholesterol": "mmol/L",
            "hemoglobin": "g/L",
            "creatinine": "μmol/L",
            "weight": "kg",
            "height": "cm",
            "temperature": "°C",
            "blood_pressure": "mmHg",
        },
        "date_format": "DD/MM/YYYY",
        "date_regex_order": ("day", "month", "year"),
        "primary_languages": ["en"],
        "emergency_number": "999",
        "ambulance_number": "999",
        "national_guidelines_body": "National Health Service (NHS) Pathology & NICE",
        "typical_labs": ["NHS Trust Laboratories", "Synnovis", "The Doctors Laboratory (TDL)", "HCA UK Labs"],
        "currency": "GBP (£)",
    },
    "AE": {
        "code": "AE",
        "name": "United Arab Emirates",
        "flag": "🇦🇪",
        "preferred_units": {
            "glucose": "mg/dL",
            "cholesterol": "mg/dL",
            "hemoglobin": "g/dL",
            "creatinine": "mg/dL",
            "weight": "kg",
            "height": "cm",
            "temperature": "°C",
            "blood_pressure": "mmHg",
        },
        "date_format": "DD/MM/YYYY",
        "date_regex_order": ("day", "month", "year"),
        "primary_languages": ["ar", "en"],
        "emergency_number": "998",
        "ambulance_number": "998",
        "national_guidelines_body": "Dubai Health Authority (DHA) & Department of Health Abu Dhabi (DOH)",
        "typical_labs": ["Cleveland Clinic Abu Dhabi Lab", "Mediclinic Middle East", "Al Borg Diagnostics"],
        "currency": "AED (د.إ)",
    },
    "DE": {
        "code": "DE",
        "name": "Germany",
        "flag": "🇩🇪",
        "preferred_units": {
            "glucose": "mg/dL",  # Often dual: mg/dL & mmol/L
            "cholesterol": "mg/dL",
            "hemoglobin": "g/dL",
            "creatinine": "mg/dL",
            "weight": "kg",
            "height": "cm",
            "temperature": "°C",
            "blood_pressure": "mmHg",
        },
        "date_format": "DD.MM.YYYY",
        "date_regex_order": ("day", "month", "year"),
        "primary_languages": ["de", "en"],
        "emergency_number": "112",
        "ambulance_number": "112",
        "national_guidelines_body": "Bundesärztekammer (Rili-BÄK) & Deutsche Diabetes Gesellschaft (DDG)",
        "typical_labs": ["Charité Universitätsmedizin Berlin", "Synlab Deutschland", "Labor Berlin", "Limbach Gruppe"],
        "currency": "EUR (€)",
    },
    "FR": {
        "code": "FR",
        "name": "France",
        "flag": "🇫🇷",
        "preferred_units": {
            "glucose": "g/L",
            "cholesterol": "g/L",
            "hemoglobin": "g/dL",
            "creatinine": "μmol/L",
            "weight": "kg",
            "height": "cm",
            "temperature": "°C",
            "blood_pressure": "mmHg",
        },
        "date_format": "DD/MM/YYYY",
        "date_regex_order": ("day", "month", "year"),
        "primary_languages": ["fr", "en"],
        "emergency_number": "15",
        "ambulance_number": "15",
        "national_guidelines_body": "Haute Autorité de Santé (HAS)",
        "typical_labs": ["Eurofins Biomnis", "Cerba Healthcare", "AP-HP Laboratoires"],
        "currency": "EUR (€)",
    },
    "AU": {
        "code": "AU",
        "name": "Australia",
        "flag": "🇦🇺",
        "preferred_units": {
            "glucose": "mmol/L",
            "cholesterol": "mmol/L",
            "hemoglobin": "g/L",
            "creatinine": "μmol/L",
            "weight": "kg",
            "height": "cm",
            "temperature": "°C",
            "blood_pressure": "mmHg",
        },
        "date_format": "DD/MM/YYYY",
        "date_regex_order": ("day", "month", "year"),
        "primary_languages": ["en"],
        "emergency_number": "000",
        "ambulance_number": "000",
        "national_guidelines_body": "Royal College of Pathologists of Australasia (RCPA)",
        "typical_labs": ["Sonic Healthcare", "Healius Pathology", "Australian Clinical Labs"],
        "currency": "AUD (A$)",
    },
}

# Molecular Weights & Conversion Factors
# Rule: Never modify original data. Converted value = original * factor or formula.
ANALYTE_CONVERSIONS: Dict[str, Dict[str, Any]] = {
    "glucose": {
        "concept": "GLUCOSE_BLOOD",
        "loinc": "1558-6",
        "canonical_unit": "mg/dL",
        "conversions": {
            ("mg/dL", "mmol/L"): lambda v: round(v / 18.0182, 1),
            ("mmol/L", "mg/dL"): lambda v: round(v * 18.0182, 1),
            ("g/L", "mg/dL"): lambda v: round(v * 100.0, 1),
            ("mg/dL", "g/L"): lambda v: round(v / 100.0, 3),
            ("g/L", "mmol/L"): lambda v: round((v * 100.0) / 18.0182, 1),
            ("mmol/L", "g/L"): lambda v: round((v * 18.0182) / 100.0, 3),
        },
        "formula_description": "Molecular Weight of D-Glucose = 180.156 g/mol (1 mmol/L = 18.0182 mg/dL)",
    },
    "total_cholesterol": {
        "concept": "CHOLESTEROL_TOTAL",
        "loinc": "2093-3",
        "canonical_unit": "mg/dL",
        "conversions": {
            ("mg/dL", "mmol/L"): lambda v: round(v / 38.67, 2),
            ("mmol/L", "mg/dL"): lambda v: round(v * 38.67, 1),
            ("g/L", "mg/dL"): lambda v: round(v * 100.0, 1),
            ("mg/dL", "g/L"): lambda v: round(v / 100.0, 3),
            ("mmol/L", "g/L"): lambda v: round((v * 38.67) / 100.0, 3),
        },
        "formula_description": "Molecular Weight of Cholesterol = 386.65 g/mol (1 mmol/L = 38.67 mg/dL)",
    },
    "triglycerides": {
        "concept": "TRIGLYCERIDES",
        "loinc": "2571-8",
        "canonical_unit": "mg/dL",
        "conversions": {
            ("mg/dL", "mmol/L"): lambda v: round(v / 88.57, 2),
            ("mmol/L", "mg/dL"): lambda v: round(v * 88.57, 1),
        },
        "formula_description": "Triolein standard MW = 885.4 g/mol (1 mmol/L = 88.57 mg/dL)",
    },
    "hdl_cholesterol": {
        "concept": "CHOLESTEROL_HDL",
        "loinc": "2085-9",
        "canonical_unit": "mg/dL",
        "conversions": {
            ("mg/dL", "mmol/L"): lambda v: round(v / 38.67, 2),
            ("mmol/L", "mg/dL"): lambda v: round(v * 38.67, 1),
        },
        "formula_description": "Molecular Weight of Cholesterol = 386.65 g/mol (1 mmol/L = 38.67 mg/dL)",
    },
    "ldl_cholesterol": {
        "concept": "CHOLESTEROL_LDL",
        "loinc": "13457-7",
        "canonical_unit": "mg/dL",
        "conversions": {
            ("mg/dL", "mmol/L"): lambda v: round(v / 38.67, 2),
            ("mmol/L", "mg/dL"): lambda v: round(v * 38.67, 1),
        },
        "formula_description": "Molecular Weight of Cholesterol = 386.65 g/mol (1 mmol/L = 38.67 mg/dL)",
    },
    "creatinine": {
        "concept": "CREATININE_SERUM",
        "loinc": "2160-0",
        "canonical_unit": "mg/dL",
        "conversions": {
            ("mg/dL", "μmol/L"): lambda v: round(v * 88.4, 1),
            ("mg/dL", "umol/L"): lambda v: round(v * 88.4, 1),
            ("μmol/L", "mg/dL"): lambda v: round(v / 88.4, 2),
            ("umol/L", "mg/dL"): lambda v: round(v / 88.4, 2),
        },
        "formula_description": "Molecular Weight of Creatinine = 113.12 g/mol (1 mg/dL = 88.4 μmol/L)",
    },
    "hemoglobin": {
        "concept": "HEMOGLOBIN",
        "loinc": "718-7",
        "canonical_unit": "g/dL",
        "conversions": {
            ("g/dL", "g/L"): lambda v: round(v * 10.0, 1),
            ("g/L", "g/dL"): lambda v: round(v / 10.0, 1),
            ("g/dL", "mmol/L"): lambda v: round(v * 0.6206, 2),
            ("mmol/L", "g/dL"): lambda v: round(v / 0.6206, 1),
        },
        "formula_description": "Standard metric shift 1 g/dL = 10 g/L; Hemoglobin tetramer factor = 0.6206",
    },
    "hba1c": {
        "concept": "GLYCATED_HEMOGLOBIN",
        "loinc": "4548-4",
        "canonical_unit": "%",
        "conversions": {
            ("%", "mmol/mol"): lambda v: round((v - 2.15) * 10.929, 1),
            ("mmol/mol", "%"): lambda v: round((v * 0.09148) + 2.152, 2),
        },
        "formula_description": "Master IFCC-NGSP Equation: IFCC (mmol/mol) = (NGSP [%] - 2.15) * 10.929",
    },
    "bilirubin_total": {
        "concept": "BILIRUBIN_TOTAL",
        "loinc": "1975-2",
        "canonical_unit": "mg/dL",
        "conversions": {
            ("mg/dL", "μmol/L"): lambda v: round(v * 17.1, 1),
            ("mg/dL", "umol/L"): lambda v: round(v * 17.1, 1),
            ("μmol/L", "mg/dL"): lambda v: round(v / 17.1, 2),
            ("umol/L", "mg/dL"): lambda v: round(v / 17.1, 2),
        },
        "formula_description": "Molecular Weight of Bilirubin = 584.66 g/mol (1 mg/dL = 17.1 μmol/L)",
    },
    "urea_nitrogen": {
        "concept": "UREA_NITROGEN_BUN",
        "loinc": "3094-0",
        "canonical_unit": "mg/dL",
        "conversions": {
            ("mg/dL", "mmol/L"): lambda v: round(v * 0.357, 2),
            ("mmol/L", "mg/dL"): lambda v: round(v / 0.357, 1),
        },
        "formula_description": "BUN to Urea standard factor: 1 mg/dL BUN = 0.357 mmol/L Urea",
    },
}

# Physical & Anthropometric Conversions
PHYSICAL_CONVERSIONS: Dict[str, Dict[str, Any]] = {
    "weight": {
        ("kg", "lb"): lambda v: round(v * 2.20462, 1),
        ("lb", "kg"): lambda v: round(v / 2.20462, 1),
        ("kg", "stone"): lambda v: round(v * 0.157473, 2),
        ("stone", "kg"): lambda v: round(v / 0.157473, 1),
    },
    "height": {
        ("cm", "inches"): lambda v: round(v / 2.54, 1),
        ("inches", "cm"): lambda v: round(v * 2.54, 1),
        ("m", "feet"): lambda v: round(v * 3.28084, 2),
        ("feet", "m"): lambda v: round(v / 3.28084, 2),
    },
    "temperature": {
        ("°C", "°F"): lambda v: round((v * 9 / 5) + 32, 1),
        ("°F", "°C"): lambda v: round((v - 32) * 5 / 9, 1),
        ("C", "F"): lambda v: round((v * 9 / 5) + 32, 1),
        ("F", "C"): lambda v: round((v - 32) * 5 / 9, 1),
    },
    "volume": {
        ("mL", "oz"): lambda v: round(v / 29.5735, 2),
        ("oz", "mL"): lambda v: round(v * 29.5735, 1),
        ("fl oz", "mL"): lambda v: round(v * 29.5735, 1),
        ("mL", "fl oz"): lambda v: round(v / 29.5735, 2),
    },
    "pressure": {
        ("mmHg", "kPa"): lambda v: round(v * 0.133322, 2),
        ("kPa", "mmHg"): lambda v: round(v / 0.133322, 1),
    },
}

# Regional Reference Ranges (Demonstrating Lab Discrepancy & Region-Aware Interpretation)
# "NEVER assume one universal normal range"
REGIONAL_REFERENCE_INTERVALS: Dict[str, Dict[str, Dict[str, Any]]] = {
    "glucose_fasting": {
        "IN": {
            "source_authority": "ICMR Guidelines (India)",
            "range_str": "70 - 100 mg/dL",
            "low": 70,
            "high": 100,
            "unit": "mg/dL",
            "prediabetes_range": "100 - 125 mg/dL",
            "diabetic_cutoff": ">= 126 mg/dL",
            "clinical_notes": "Indian consensus targets fasting plasma glucose < 100 mg/dL for non-diabetic screening.",
        },
        "US": {
            "source_authority": "American Diabetes Association (ADA 2024)",
            "range_str": "70 - 99 mg/dL",
            "low": 70,
            "high": 99,
            "unit": "mg/dL",
            "prediabetes_range": "100 - 125 mg/dL (Impaired Fasting Glucose)",
            "diabetic_cutoff": ">= 126 mg/dL",
            "clinical_notes": "ADA criteria strictly cuts off normal fasting at 99 mg/dL.",
        },
        "GB": {
            "source_authority": "NICE Guidelines / NHS Pathology (UK)",
            "range_str": "3.9 - 5.5 mmol/L",
            "low": 3.9,
            "high": 5.5,
            "unit": "mmol/L",
            "prediabetes_range": "5.6 - 6.9 mmol/L (Impaired Fasting Glycaemia)",
            "diabetic_cutoff": ">= 7.0 mmol/L",
            "clinical_notes": "NHS uses venous plasma glucose in mmol/L; normal interval ends at 5.5 mmol/L (99 mg/dL equivalent).",
        },
        "DE": {
            "source_authority": "Deutsche Diabetes Gesellschaft (DDG)",
            "range_str": "70 - 99 mg/dL (3.9 - 5.5 mmol/L)",
            "low": 70,
            "high": 99,
            "unit": "mg/dL",
            "prediabetes_range": "100 - 125 mg/dL",
            "diabetic_cutoff": ">= 126 mg/dL",
            "clinical_notes": "German laboratories display both mg/dL and mmol/L depending on federal state.",
        },
        "AE": {
            "source_authority": "Dubai Health Authority (DHA Standard)",
            "range_str": "70 - 100 mg/dL",
            "low": 70,
            "high": 100,
            "unit": "mg/dL",
            "prediabetes_range": "100 - 125 mg/dL",
            "diabetic_cutoff": ">= 126 mg/dL",
            "clinical_notes": "Follows unified Gulf cooperation clinical laboratory criteria.",
        },
    },
    "total_cholesterol": {
        "IN": {
            "source_authority": "Cardiological Society of India (CSI)",
            "range_str": "< 200 mg/dL (Desirable)",
            "low": 125,
            "high": 200,
            "unit": "mg/dL",
            "borderline_range": "200 - 239 mg/dL",
            "high_cutoff": ">= 240 mg/dL",
            "clinical_notes": "South Asian phenotype has higher premature CAD risk; aggressive LDL targets advocated.",
        },
        "US": {
            "source_authority": "AHA/ACC / NCEP ATP III",
            "range_str": "< 200 mg/dL",
            "low": 125,
            "high": 200,
            "unit": "mg/dL",
            "borderline_range": "200 - 239 mg/dL",
            "high_cutoff": ">= 240 mg/dL",
            "clinical_notes": "AHA focuses on 10-year ASCVD risk calculator rather than total cholesterol alone.",
        },
        "GB": {
            "source_authority": "NICE Clinical Guideline CG181 (NHS UK)",
            "range_str": "< 5.0 mmol/L",
            "low": 3.0,
            "high": 5.0,
            "unit": "mmol/L",
            "borderline_range": "5.0 - 6.4 mmol/L",
            "high_cutoff": ">= 6.5 mmol/L",
            "clinical_notes": "NICE recommends total cholesterol < 5.0 mmol/L (equiv to 193 mg/dL) for adults.",
        },
        "DE": {
            "source_authority": "Deutsche Gesellschaft für Kardiologie (DGK)",
            "range_str": "< 200 mg/dL (< 5.2 mmol/L)",
            "low": 120,
            "high": 200,
            "unit": "mg/dL",
            "borderline_range": "200 - 239 mg/dL",
            "high_cutoff": ">= 240 mg/dL",
            "clinical_notes": "Standardized German lipid profile guidelines.",
        },
    },
    "hemoglobin_male": {
        "IN": {
            "source_authority": "ICMR Guidelines",
            "range_str": "13.0 - 17.0 g/dL",
            "low": 13.0,
            "high": 17.0,
            "unit": "g/dL",
            "clinical_notes": "Common screening threshold in Indian reference labs.",
        },
        "US": {
            "source_authority": "CLIA / Quest Diagnostics",
            "range_str": "13.2 - 17.5 g/dL",
            "low": 13.2,
            "high": 17.5,
            "unit": "g/dL",
            "clinical_notes": "US adult male reference range.",
        },
        "GB": {
            "source_authority": "NHS Pathology Reference Interval",
            "range_str": "130 - 175 g/L",
            "low": 130,
            "high": 175,
            "unit": "g/L",
            "clinical_notes": "NHS mandates SI units in g/L for full blood count (FBC).",
        },
        "DE": {
            "source_authority": "Charité Berlin Reference Lab",
            "range_str": "13.5 - 17.5 g/dL",
            "low": 13.5,
            "high": 17.5,
            "unit": "g/dL",
            "clinical_notes": "German hospital standard.",
        },
    },
    "creatinine_male": {
        "IN": {
            "source_authority": "Apollo / Metropolis Lab",
            "range_str": "0.70 - 1.30 mg/dL",
            "low": 0.70,
            "high": 1.30,
            "unit": "mg/dL",
            "clinical_notes": "Jaffe rate-blanked or enzymatic assay standard.",
        },
        "US": {
            "source_authority": "NKF / LabCorp",
            "range_str": "0.74 - 1.35 mg/dL",
            "low": 0.74,
            "high": 1.35,
            "unit": "mg/dL",
            "clinical_notes": "IDMS-traceable standard.",
        },
        "GB": {
            "source_authority": "NHS Renal Association",
            "range_str": "60 - 110 μmol/L",
            "low": 60,
            "high": 110,
            "unit": "μmol/L",
            "clinical_notes": "NHS reports serum creatinine strictly in micromoles per liter (μmol/L).",
        },
        "DE": {
            "source_authority": "Labor Berlin",
            "range_str": "0.70 - 1.20 mg/dL (62 - 106 μmol/L)",
            "low": 0.70,
            "high": 1.20,
            "unit": "mg/dL",
            "clinical_notes": "DIN standard for adult males.",
        },
    },
}

# Multi-lingual Medical Terminology & Concept Maps
# Maps synonyms in Hindi, German, Arabic, French, and vernacular English to canonical concepts
MEDICAL_CONCEPT_TAXONOMY: Dict[str, Dict[str, Any]] = {
    "GLUCOSE_FASTING": {
        "canonical_name": "Fasting Blood Glucose (FBG)",
        "category": "investigation",
        "loinc": "1558-6",
        "snomed_ct": "43491000124108",
        "synonyms": [
            "fasting blood sugar", "fbs", "fasting glucose", "sugar fasting", "blood sugar fasting",
            "sugar", "blood sugar", "fasting sugar level", "rbs fasting",
            # Hindi
            "फास्टिंग ब्लड शुगर", "खाली पेट रक्त शर्करा", "ब्लड शुगर", "फास्टिंग शुगर", "शर्करा", "शुगर",
            # German
            "nüchternglukose", "nüchternblutzucker", "blutzucker nüchtern", "blutzucker", "glukose nüchtern", "bz nüchtern",
            # Arabic
            "سكر الدم الصائم", "جلوكوز الدم الصائم", "تحليل السكر الصائم", "سكر الدم",
            # French
            "glycémie à jeun", "glucose à jeun", "sucre sanguin",
        ],
        "default_analyte": "glucose",
    },
    "GLUCOSE_POSTPRANDIAL": {
        "canonical_name": "Post-Prandial Blood Glucose (PPBS)",
        "category": "investigation",
        "loinc": "1521-4",
        "snomed_ct": "271064000",
        "synonyms": [
            "post prandial blood glucose", "ppbs", "pp sugar", "post meal glucose", "after food sugar", "2hr postprandial",
            # Hindi
            "भोजन के बाद रक्त शर्करा", "पीपी शुगर", "पीपीबीएस",
            # German
            "postprandialer blutzucker", "glukose postprandial", "blutzucker nach dem essen",
            # Arabic
            "سكر الدم بعد الأكل", "تحليل السكر بعد الأكل بساعتين",
        ],
        "default_analyte": "glucose",
    },
    "HBA1C": {
        "canonical_name": "Glycated Hemoglobin (HbA1c)",
        "category": "investigation",
        "loinc": "4548-4",
        "snomed_ct": "43396009",
        "synonyms": [
            "hba1c", "glycated hemoglobin", "glycohemoglobin", "a1c", "hemoglobin a1c", "3 month sugar",
            # Hindi
            "एचबीए1सी", "ग्लाइकेटेड हीमोग्लोबिन", "तीन महीने का शुगर",
            # German
            "hba1c", "glykiertes hämoglobin", "langzeitblutzucker",
            # Arabic
            "السكر التراكمي", "خضاب الدم السكري", "تحليل hba1c",
            # French
            "hémoglobine glyquée", "hba1c",
        ],
        "default_analyte": "hba1c",
    },
    "CHOLESTEROL_TOTAL": {
        "canonical_name": "Total Serum Cholesterol",
        "category": "investigation",
        "loinc": "2093-3",
        "snomed_ct": "121868005",
        "synonyms": [
            "total cholesterol", "cholesterol", "s. cholesterol", "serum cholesterol", "lipid total",
            # Hindi
            "कुल कोलेस्ट्रॉल", "कोलेस्ट्रॉल", "सीरम कोलेस्ट्रॉल",
            # German
            "gesamtcholesterin", "cholesterin", "cholesterin gesamt",
            # Arabic
            "الكوليسترول الكلي", "تحليل الكوليسترول",
            # French
            "cholestérol total", "cholestérol",
        ],
        "default_analyte": "total_cholesterol",
    },
    "CREATININE_SERUM": {
        "canonical_name": "Serum Creatinine",
        "category": "investigation",
        "loinc": "2160-0",
        "snomed_ct": "104185000",
        "synonyms": [
            "serum creatinine", "creatinine", "s. creatinine", "sr creatinine", "kidney creatinine",
            # Hindi
            "सीरम क्रिएटिनिन", "क्रिएटिनिन", "किडनी क्रिएटिनिन",
            # German
            "serumkreatinin", "kreatinin", "krea",
            # Arabic
            "الكرياتينين في المصل", "كرياتينين",
            # French
            "créatinine sérique", "créatinine",
        ],
        "default_analyte": "creatinine",
    },
    "HEMOGLOBIN": {
        "canonical_name": "Hemoglobin (Hb)",
        "category": "investigation",
        "loinc": "718-7",
        "snomed_ct": "259695007",
        "synonyms": [
            "hemoglobin", "hb", "hgb", "blood hemoglobin", "cbc hb",
            # Hindi
            "हीमोग्लोबिन", "रक्त स्तर", "खून की कमी टेस्ट",
            # German
            "hämoglobin", "hb-wert", "hb wert",
            # Arabic
            "الهيموغلوبين", "خضاب الدم",
            # French
            "hémoglobine", "hb",
        ],
        "default_analyte": "hemoglobin",
    },
    "BLOOD_PRESSURE": {
        "canonical_name": "Blood Pressure (Systolic / Diastolic)",
        "category": "vital",
        "loinc": "85354-9",
        "snomed_ct": "75367002",
        "synonyms": [
            "blood pressure", "bp", "arterial pressure", "systolic diastolic", "bp reading",
            # Hindi
            "रक्तचाप", "बीपी", "ब्लड प्रेशर",
            # German
            "blutdruck", "rr", "blutdruckwert",
            # Arabic
            "ضغط الدم",
            # French
            "tension artérielle", "pression artérielle",
        ],
        "default_analyte": "pressure",
    },
    "HYPERTENSION": {
        "canonical_name": "Essential (Primary) Hypertension",
        "category": "condition",
        "icd_10": "I10",
        "snomed_ct": "59621000",
        "synonyms": [
            "hypertension", "high blood pressure", "htn", "essential hypertension", "systemic hypertension",
            # Hindi
            "उच्च रक्तचाप", "हाई बीपी", "उच्च तनाव",
            # German
            "hypertonie", "arterielle hypertonie", "bluthochdruck",
            # Arabic
            "ارتفاع ضغط الدم", "فرط ضغط الدم",
            # French
            "hypertension artérielle", "hta",
        ],
    },
    "TYPE_2_DIABETES": {
        "canonical_name": "Type 2 Diabetes Mellitus",
        "category": "condition",
        "icd_10": "E11",
        "snomed_ct": "44054006",
        "synonyms": [
            "type 2 diabetes mellitus", "t2dm", "type 2 diabetes", "diabetes mellitus", "sugar complaint", "adult onset diabetes",
            # Hindi
            "टाइप 2 मधुमेह", "मधुमेह", "शुगर की बीमारी", "डायबिटीज",
            # German
            "typ-2-diabetes mellitus", "typ 2 diabetes", "zuckerkrankheit", "diabetes mellitus typ 2",
            # Arabic
            "السكري من النوع الثاني", "مرض السكر",
            # French
            "diabète de type 2", "diabète sucré",
        ],
    },
    "CHRONIC_KIDNEY_DISEASE": {
        "canonical_name": "Chronic Kidney Disease (CKD)",
        "category": "condition",
        "icd_10": "N18",
        "snomed_ct": "709044004",
        "synonyms": [
            "chronic kidney disease", "ckd", "renal impairment", "chronic renal disease", "renal insufficiency",
            # Hindi
            "क्रोनिक किडनी रोग", "गुर्दे की बीमारी", "गुर्दे की विफलता",
            # German
            "chronische niereninsuffizienz", "chronische nierenerkrankung", "ckd",
            # Arabic
            "المرض الكلوي المزمن", "قصور كلوي مزمن",
            # French
            "maladie rénale chronique", "insuffisance rénale chronique",
        ],
    },
}

# Cross-Border Medication Brand & Generic Disambiguation Map
# Solves the Paracetamol vs Acetaminophen challenge across borders
MEDICATION_CROSS_BORDER_MAP: Dict[str, Dict[str, Any]] = {
    "PARACETAMOL": {
        "generic_inn": "Paracetamol",
        "us_generic_name": "Acetaminophen",
        "rxnorm_cui": "161",
        "atc_code": "N02BE01",
        "drug_class": "Analgesic / Antipyretic",
        "regional_brands": {
            "IN": ["Crocin", "Dolo-650", "Calpol", "Pacimol", "Sumo L"],
            "US": ["Tylenol", "Panadol", "Mapap", "Feverall"],
            "GB": ["Panadol", "Calpol", "Disprol", "Hedex"],
            "AE": ["Panadol", "Adol", "Fevadol", "Omol"],
            "DE": ["Ben-u-ron", "Paracetamol-ratiopharm", "Perfalgan"],
            "FR": ["Doliprane", "Dafalgan", "Efferalgan"],
            "AU": ["Panadol", "Herron", "Dymadon"],
        },
        "equivalency_note": "Paracetamol (INN / British Approved Name / International) is chemically identical to Acetaminophen (USAN / United States Adopted Name). When traveling to the US, prescribe/dispense Acetaminophen (Tylenol).",
    },
    "METFORMIN": {
        "generic_inn": "Metformin Hydrochloride",
        "us_generic_name": "Metformin HCl",
        "rxnorm_cui": "6809",
        "atc_code": "A10BA02",
        "drug_class": "Biguanide Antidiabetic",
        "regional_brands": {
            "IN": ["Glycomet", "Obimet", "Cetapin", "Formin"],
            "US": ["Glucophage", "Fortamet", "Glumetza", "Riomet"],
            "GB": ["Glucophage", "Bolamyn", "Metabet"],
            "AE": ["Glucophage", "Formit"],
            "DE": ["Glucophage", "Metfogamma", "Siofor"],
            "FR": ["Glucophage", "Stagid"],
        },
        "equivalency_note": "Universal active ingredient Metformin HCl. Standard formulation 500mg, 850mg, 1000mg or SR/ER.",
    },
    "AMLODIPINE": {
        "generic_inn": "Amlodipine Besylate",
        "us_generic_name": "Amlodipine Besylate",
        "rxnorm_cui": "17767",
        "atc_code": "C08CA01",
        "drug_class": "Dihydropyridine Calcium Channel Blocker",
        "regional_brands": {
            "IN": ["Amlong", "Stamlo", "Amlopin", "Amlovas"],
            "US": ["Norvasc", "Katerzia"],
            "GB": ["Istin", "Amlodipine generic"],
            "AE": ["Norvasc", "Amlor"],
            "DE": ["Norvasc", "Amlodipin-ratiopharm"],
            "FR": ["Amlor"],
        },
        "equivalency_note": "Amlodipine Besylate is internationally marketed under Norvasc (Pfizer) or generic equivalents.",
    },
    "ATORVASTATIN": {
        "generic_inn": "Atorvastatin Calcium",
        "us_generic_name": "Atorvastatin Calcium",
        "rxnorm_cui": "83367",
        "atc_code": "C10AA05",
        "drug_class": "HMG-CoA Reductase Inhibitor (Statin)",
        "regional_brands": {
            "IN": ["Atorva", "Storvas", "Lipikind", "Atocor"],
            "US": ["Lipitor"],
            "GB": ["Lipitor"],
            "AE": ["Lipitor", "Atorlip"],
            "DE": ["Sortis", "Atorvastatin HEXAL"],
            "FR": ["Tahor"],
        },
        "equivalency_note": "Globally known as Lipitor or Atorvastatin. Dosages 10mg, 20mg, 40mg, 80mg identical worldwide.",
    },
}
