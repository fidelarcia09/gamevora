package com.gamersgold.paymentreader

import android.content.Context
import java.util.UUID

internal object DeviceIdentity {
    fun get(context: Context): String {
        val prefs = context.getSharedPreferences("gvr_device_identity", Context.MODE_PRIVATE)
        prefs.getString("device_id", null)?.let { return it }
        val created = UUID.randomUUID().toString()
        prefs.edit().putString("device_id", created).commit()
        return prefs.getString("device_id", created) ?: created
    }
}
