package dev.zephirox.avantusine.android;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import androidx.activity.OnBackPressedCallback;
public class MainActivity extends BridgeActivity {
  @Override public void onCreate(Bundle state){registerPlugin(LocalExportPlugin.class);registerPlugin(AndroidUpdatesPlugin.class);super.onCreate(state);getOnBackPressedDispatcher().addCallback(this,new OnBackPressedCallback(true){@Override public void handleOnBackPressed(){getBridge().getWebView().evaluateJavascript("window.AU_ANDROID_BACK ? window.AU_ANDROID_BACK() : false",value->{if(!"true".equals(value))finish();});}});}
}
