package dev.zephirox.avantusine.android;

import android.app.Activity;
import android.content.Intent;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.*;
import com.getcapacitor.annotation.*;
import java.io.OutputStream;

@CapacitorPlugin(name="LocalExport")
public class LocalExportPlugin extends Plugin {
  @PluginMethod public void save(PluginCall call) {
    if(call.getString("data")==null){call.reject("Fichier manquant");return;}
    Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT);
    intent.addCategory(Intent.CATEGORY_OPENABLE);
    intent.setType(call.getString("mime","application/octet-stream"));
    intent.putExtra(Intent.EXTRA_TITLE,call.getString("name","export.zip"));
    startActivityForResult(call,intent,"saveResult");
  }
  @ActivityCallback private void saveResult(PluginCall call,ActivityResult result) {
    if(call==null)return;
    if(result.getResultCode()!=Activity.RESULT_OK||result.getData()==null||result.getData().getData()==null){JSObject ret=new JSObject();ret.put("cancelled",true);call.resolve(ret);return;}
    final android.net.Uri uri=result.getData().getData();
    new Thread(()->{try(OutputStream out=getContext().getContentResolver().openOutputStream(uri,"wt")){
      if(out==null)throw new java.io.IOException("Destination inaccessible");
      out.write(Base64.decode(call.getString("data"),Base64.DEFAULT));out.flush();JSObject ret=new JSObject();ret.put("cancelled",false);call.resolve(ret);
    }catch(Exception e){call.reject("Enregistrement impossible",e);}}).start();
  }
}
