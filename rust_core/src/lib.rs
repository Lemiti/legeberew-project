use std::io::Cursor;
use image::imageops::FilterType;
use tract_tflite::prelude::*;
use serde_json::json;

uniffi::include_scaffolding!("legeberew");

// 1. Embed the AI model directly into the compiled binary!
const MODEL_BYTES: &[u8] = include_bytes!("pristine_plant_doctor.tflite");

pub fn system_check() -> String {
    String::from("✅ LeGeberew Edge Node: Rust Core is Online!")
}

// 2. The Main Inference Function
pub fn diagnose_leaf(image_bytes: Vec<u8>) -> String {
    // A. Parse the image bytes sent from React Native
    let img = match image::load_from_memory(&image_bytes) {
        Ok(i) => i.to_rgb8(),
        Err(_) => return json!({"error": "Failed to decode image bytes"}).to_string(),
    };

    // B. Resize to 224x224 (MobileNetV2 requirement)
    let resized = image::imageops::resize(&img, 224, 224, FilterType::Triangle);

    // C. Convert pixels to f32 and normalize to [-1.0, 1.0]
    let mut tensor_data: Vec<f32> = Vec::with_capacity(224 * 224 * 3);
    for pixel in resized.pixels() {
        tensor_data.push((pixel[0] as f32 / 127.5) - 1.0); // R
        tensor_data.push((pixel[1] as f32 / 127.5) - 1.0); // G
        tensor_data.push((pixel[2] as f32 / 127.5) - 1.0); // B
    }

    // D. Create the Tract Tensor [1, 224, 224, 3]
    let tensor = match tract_ndarray::Array4::from_shape_vec((1, 224, 224, 3), tensor_data) {
        Ok(t) => t.into_tensor(),
        Err(_) => return json!({"error": "Failed to build tensor"}).to_string(),
    };

 // E. Load and Run the Model
    let model = match tract_tflite::tflite().model_for_read(&mut Cursor::new(MODEL_BYTES)) {
        Ok(m) => m,
        // CHANGED: We now capture the error 'e' and format it into the JSON
        Err(e) => return json!({"error": format!("Parse Error: {}", e)}).to_string(),
    };

    let runnable = match model.into_runnable() {
        Ok(r) => r,
        Err(e) => return json!({"error": format!("Runnable Error: {}", e)}).to_string(),
    };

    // Run inference!
    let result = match runnable.run(tvec!(tensor.into())) {
        Ok(res) => res,
        Err(e) => return json!({"error": format!("Inference Error: {}", e)}).to_string(),
    };

    // F. Extract the highest probability (ArgMax)
    let output_tensor = result[0].to_array_view::<f32>().unwrap();
    let probabilities = output_tensor.as_slice().unwrap();
    
    let mut max_idx = 0;
    let mut max_prob = 0.0;
    for (i, &prob) in probabilities.iter().enumerate() {
        if prob > max_prob {
            max_prob = prob;
            max_idx = i;
        }
    }

    // G. Map to Amharic and return JSON
    let disease_name = map_class_to_amharic(max_idx);
    
    json!({
        "disease_id": max_idx,
        "disease_amharic": disease_name,
        "confidence": max_prob * 100.0,
        "status": "success"
    }).to_string()
}

// 3. The Amharic Dictionary
fn map_class_to_amharic(index: usize) -> &'static str {
    match index {
        0 => "ጤናማ ቡና (Healthy Coffee)",
        1 => "የቡና ቀይ የሸረሪት ሚጥ (Coffee Red Spider Mite)",
        2 => "የቡና ዝገት በሽታ (Coffee Rust)",
        3 => "የቲማቲም የባክቴሪያ ነጠብጣብ (Tomato Bacterial Spot)",
        4 => "የቲማቲም ቅድመ ብላይት (Tomato Early Blight)",
        5 => "የቲማቲም ዘግይቶ ብላይት (Tomato Late Blight)",
        6 => "የቲማቲም ቅጠል ሻጋታ (Tomato Leaf Mold)",
        7 => "የቲማቲም ሴፕቶሪያ ነጠብጣብ (Tomato Septoria Leaf Spot)",
        8 => "የቲማቲም የሸረሪት ሚጥ (Tomato Spider Mite)",
        9 => "የቲማቲም ታርጌት ስፖት (Tomato Target Spot)",
        10 => "የቲማቲም ቢጫ ቅጠል መጠቅለል ቫይረስ (Tomato Yellow Leaf Curl)",
        11 => "የቲማቲም ሞዛይክ ቫይረስ (Tomato Mosaic Virus)",
        12 => "ጤናማ ቲማቲም (Healthy Tomato)",
        _ => "ያልታወቀ በሽታ (Unknown Disease)",
    }
}
