package dev.zephirox.avantusine.android;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
public class MainActivity extends BridgeActivity {
  @Override public void onCreate(Bundle state){registerPlugin(LocalExportPlugin.class);registerPlugin(AndroidUpdatesPlugin.class);super.onCreate(state);}
}
