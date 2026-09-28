package tj.ustoyob.app;

import android.graphics.Color;
import android.view.Window;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Android 15+ (targetSdk 35+, см. android/variables.gradle: 36) принудительно включает
 * edge-to-edge — Window#setStatusBarColor/setNavigationBarColor стали no-op, никто (ни родной
 * @capacitor/status-bar, ни наш код) больше не может покрасить полосы этим способом. Сам
 * edge-to-edge при этом уже реализован в ядре Capacitor (см. com.getcapacitor.plugin.SystemBars —
 * оно же прокидывает env(safe-area-inset-*) в CSS), но красит фон ОКНА под прозрачными барами
 * статическим android:windowBackground из styles.xml — тем, что читается один раз из системной
 * (Android night mode), а не из темы ПРИЛОЖЕНИЯ, которая переключается вручную в JS и может
 * не совпадать с системной (ровно та же проблема, что уже чинили для иконок статус-бара — см.
 * utils/nativeChrome.ts: syncStatusBar). Этот плагин — недостающий кусок: красит именно то,
 * что показывает Capacitor под прозрачными барами, по команде из JS при каждой смене темы.
 */
@CapacitorPlugin(name = "NavigationBar")
public class NavigationBarPlugin extends Plugin {
    @PluginMethod
    public void setColor(PluginCall call) {
        String colorHex = call.getString("color");
        if (colorHex == null) {
            call.reject("Missing 'color'");
            return;
        }
        boolean lightIcons = Boolean.TRUE.equals(call.getBoolean("lightIcons", false));

        getActivity().runOnUiThread(() -> {
            Window window = getActivity().getWindow();
            window.getDecorView().setBackgroundColor(Color.parseColor(colorHex));

            // Контраст иконок статус-бара/жест-панели — тот же WindowInsetsControllerCompat,
            // что использует Capacitor SystemBars, а не устаревшие SYSTEM_UI_FLAG_*.
            WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, window.getDecorView());
            controller.setAppearanceLightStatusBars(!lightIcons);
            controller.setAppearanceLightNavigationBars(!lightIcons);

            call.resolve(new JSObject());
        });
    }
}
