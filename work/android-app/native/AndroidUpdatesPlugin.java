package dev.zephirox.avantusine.android;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.*;
import java.net.*;
import java.security.MessageDigest;
import java.util.Locale;

@CapacitorPlugin(name="AndroidUpdates")
public class AndroidUpdatesPlugin extends Plugin {
  private volatile boolean busy=false;
  @PluginMethod public void info(PluginCall call){try{JSObject ret=new JSObject();ret.put("version",getContext().getPackageManager().getPackageInfo(getContext().getPackageName(),0).versionName);call.resolve(ret);}catch(Exception e){call.reject("Version inaccessible",e);}}
  @PluginMethod public synchronized void install(PluginCall call){
    if(busy){call.reject("Une mise à jour est déjà en cours");return;}
    final String url=call.getString("url",""),sha=call.getString("sha256","");
    try{URI parsed=new URI(url);if(!"https".equals(parsed.getScheme())||!"github.com".equals(parsed.getHost())||!parsed.getPath().startsWith("/zephiroxDev/avant-usine/releases/download/")||!parsed.getPath().endsWith(".apk")||!sha.matches("[a-fA-F0-9]{64}"))throw new Exception();}catch(Exception e){call.reject("Source de mise à jour invalide");return;}
    busy=true;
    new Thread(()->{File part=new File(getContext().getCacheDir(),"android-update.part"),apk=new File(getContext().getCacheDir(),"android-update.apk");
      try{
        URLConnection connection=new URL(url).openConnection();connection.setConnectTimeout(30000);connection.setReadTimeout(30000);long total=connection.getContentLengthLong(),read=0;MessageDigest digest=MessageDigest.getInstance("SHA-256");
        try(InputStream input=connection.getInputStream();OutputStream output=new FileOutputStream(part)){byte[] buffer=new byte[65536];int n;long reported=0;while((n=input.read(buffer))!=-1){read+=n;if(read>200L*1024*1024)throw new IOException("Paquet trop volumineux");output.write(buffer,0,n);digest.update(buffer,0,n);if(read-reported>512*1024){reported=read;JSObject p=new JSObject();p.put("bytes",read);p.put("total",total);notifyListeners("progress",p);}}}
        StringBuilder hex=new StringBuilder();for(byte b:digest.digest())hex.append(String.format(Locale.ROOT,"%02x",b&255));if(!sha.equalsIgnoreCase(hex.toString()))throw new IOException("Empreinte de mise à jour incorrecte");
        android.content.pm.PackageInfo pkg=getContext().getPackageManager().getPackageArchiveInfo(part.getAbsolutePath(),0);if(pkg==null||!getContext().getPackageName().equals(pkg.packageName))throw new IOException("Ce paquet ne correspond pas à Avant l’usine");
        if(apk.exists()&&!apk.delete())throw new IOException("Ancien téléchargement inaccessible");if(!part.renameTo(apk))throw new IOException("Préparation du paquet impossible");
        getContext().getSharedPreferences("android-updates",0).edit().putBoolean("pendingInstall",true).apply();getActivity().runOnUiThread(()->{try{openInstaller();call.resolve();}catch(Exception e){call.reject("Installation impossible",e);}});
      }catch(Exception e){part.delete();call.reject("Mise à jour non installée : "+e.getMessage(),e);}finally{busy=false;}
    }).start();
  }
  private void openInstaller(){
    if(Build.VERSION.SDK_INT>=26&&!getContext().getPackageManager().canRequestPackageInstalls()){
      Intent permission=new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,Uri.parse("package:"+getContext().getPackageName()));getActivity().startActivity(permission);return;
    }
    File apk=new File(getContext().getCacheDir(),"android-update.apk");if(!apk.exists())return;
    Uri uri=FileProvider.getUriForFile(getContext(),getContext().getPackageName()+".fileprovider",apk);Intent installer=new Intent(Intent.ACTION_VIEW);installer.setDataAndType(uri,"application/vnd.android.package-archive");installer.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);getActivity().startActivity(installer);
    getContext().getSharedPreferences("android-updates",0).edit().putBoolean("pendingInstall",false).apply();
  }
  @Override protected void handleOnResume(){if(getContext().getSharedPreferences("android-updates",0).getBoolean("pendingInstall",false)&&(Build.VERSION.SDK_INT<26||getContext().getPackageManager().canRequestPackageInstalls())){try{openInstaller();}catch(Exception ignored){}}}
}
