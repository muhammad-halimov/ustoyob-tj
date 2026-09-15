package tj.ustoyob.app;

import android.os.Build;
import android.os.Bundle;
import android.view.Display;
import android.view.WindowManager;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestHighestRefreshRate();
    }

    @Override
    public void onResume() {
        super.onResume();
        // Некоторые прошивки сбрасывают preferredDisplayModeId при потере окном фокуса
        // (сворачивание, переключение приложений) — переустанавливаем при каждом
        // возврате на передний план, а не только один раз в onCreate.
        requestHighestRefreshRate();
    }

    // Android does not opt an app into the display's highest refresh rate (90/120Hz) by
    // default - most devices stay at 60Hz unless the foreground window explicitly asks for
    // a faster display mode. Prefers a mode at the same resolution as the current one (avoids
    // an unwanted resolution change); if none is reported, falls back to the highest refresh
    // rate available at any resolution rather than doing nothing.
    // No-op on emulators/devices that only expose a single 60Hz mode.
    //
    // Note: on phones with an "Adaptive"/"Dynamic" refresh-rate display setting (common OEM
    // LTPO panels), the OS still intentionally drops the *actual* panel refresh rate during
    // static content and ramps up during scrolling/animation to save battery — this call sets
    // the ceiling the window is allowed to use, it can't (and shouldn't try to) defeat that
    // power-saving behaviour. A user who wants a truly constant high refresh rate regardless
    // of content needs to pick a fixed rate in the device's own Settings > Display, if the
    // OEM offers one alongside "Adaptive".
    private void requestHighestRefreshRate() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return;

        Display display = getWindowManager().getDefaultDisplay();
        Display.Mode currentMode = display.getMode();
        Display.Mode bestSameResolution = currentMode;
        Display.Mode bestOverall = currentMode;

        for (Display.Mode mode : display.getSupportedModes()) {
            if (mode.getRefreshRate() > bestOverall.getRefreshRate()) {
                bestOverall = mode;
            }
            boolean sameResolution = mode.getPhysicalWidth() == currentMode.getPhysicalWidth()
                    && mode.getPhysicalHeight() == currentMode.getPhysicalHeight();
            if (sameResolution && mode.getRefreshRate() > bestSameResolution.getRefreshRate()) {
                bestSameResolution = mode;
            }
        }

        Display.Mode bestMode = bestSameResolution.getModeId() != currentMode.getModeId()
                ? bestSameResolution
                : bestOverall;

        if (bestMode.getModeId() != currentMode.getModeId()) {
            WindowManager.LayoutParams params = getWindow().getAttributes();
            params.preferredDisplayModeId = bestMode.getModeId();
            getWindow().setAttributes(params);
        }
    }
}
