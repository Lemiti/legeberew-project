package com.legeberewapp

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import java.io.File
import uniffi.legeberew.* // EXACT IMPORT

class RustCoreModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String { return "RustCoreModule" }

    @ReactMethod
    fun systemCheck(promise: Promise) {
        try {
            val result = systemCheck() 
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("RUST_ERROR", e.message)
        }
    }

    @ReactMethod
    fun scanLeaf(imagePath: String, promise: Promise) {
        try {
            val cleanPath = imagePath.replace("file://", "")
            val bytes = File(cleanPath).readBytes()
            val jsonResult = diagnoseLeaf(bytes)
            promise.resolve(jsonResult)
        } catch (e: Exception) {
            promise.reject("RUST_DIAGNOSIS_ERROR", e.message)
        }
    }
}
