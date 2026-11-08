package ing.gigawatt;

/** Starts the game engine (sidecar/bridge.mjs) in an in-process Node (nodejs-mobile). Called from GDScript via JavaClassWrapper. */
public class NodeRunner {
    private static boolean started = false;
    private static native int nativeStart(String[] args);

    public static synchronized boolean start(String script, String savesDir, int port) {
        if (started) return true;
        try { System.loadLibrary("c++_shared"); System.loadLibrary("node"); System.loadLibrary("gwnode"); }
        catch (UnsatisfiedLinkError e) { android.util.Log.e("gigawatt", "node libraries missing: " + e); return false; }
        started = true;
        final String[] args = { "node", script, savesDir, "--port", String.valueOf(port) };
        Thread t = new Thread(null, () -> nativeStart(args), "gigawatt-node", 8L * 1024 * 1024);
        t.setDaemon(true);
        t.start();
        return true;
    }
}
