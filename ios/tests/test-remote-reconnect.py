"""Run the actual Swift reconnect policy without requiring a paired device."""
from pathlib import Path
import subprocess
import tempfile
source = (Path(__file__).resolve().parents[1] / 'CWorldIOS/Features/Library/TVCompanion.swift').read_text()
start = source.index('enum DesktopRemoteReconnectPolicy {')
end = source.index('\n}\n', start) + 3
checks = '''
func allowed(_ target: String? = "mac-a", _ discovered: String? = "mac-a", _ trusted: Bool = true,
             _ connected: Bool = false, _ handshaking: Bool = false, _ suspended: Bool = false, _ attempts: Int = 0) -> Bool {
    DesktopRemoteReconnectPolicy.permits(target: target, discovered: discovered, trusted: trusted,
        connected: connected, handshaking: handshaking, suspended: suspended, attempts: attempts)
}
precondition(allowed())
precondition(!allowed(nil)) // explicit disconnect has no retained target
precondition(!allowed("mac-a", "mac-b")) // never switch to another nearby Mac
precondition(!allowed("mac-a", "mac-a", false)) // forgotten trust needs approval
precondition(!allowed("mac-a", "mac-a", true, true))
precondition(!allowed("mac-a", "mac-a", true, false, true))
precondition(!allowed("mac-a", "mac-a", true, false, false, true)) // suspended app
precondition(allowed("mac-a", "mac-a", true, false, false, false, 2))
precondition(!allowed("mac-a", "mac-a", true, false, false, false, 3))
print("9 remote reconnect policy checks passed")
'''
with tempfile.TemporaryDirectory(prefix='cworld-remote-') as directory:
    file = Path(directory) / 'main.swift'
    file.write_text(source[start:end] + checks)
    subprocess.run(['swift', '-module-cache-path', str(Path(directory) / 'modules'), str(file)], check=True)
