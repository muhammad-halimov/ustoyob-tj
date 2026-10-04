package tj.ustoyob.app;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativeCache")
public class NativeCachePlugin extends Plugin {
    @PluginMethod
    public void clearWebViewCache(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                getBridge().getWebView().clearCache(true);
                call.resolve();
            } catch (Exception error) {
                call.reject("Could not clear the Android WebView cache", error);
            }
        });
    }
}
