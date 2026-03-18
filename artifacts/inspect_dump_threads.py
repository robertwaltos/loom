from minidump.minidumpfile import MinidumpFile
from pathlib import Path

dump_path = Path(r"D:\pythonprojects\koydo_loom\artifacts\crash-dumps\KoydoLoom-Win64-Shipping.exe.123520.dmp")
mdmp = MinidumpFile.parse(str(dump_path))
try:
    mdmp.get_threads()
except Exception as e:
    print('GET_THREADS_ERROR', repr(e))
for t in mdmp.threads.threads[:10]:
    print('THREAD', t.ThreadId, hex(t.Teb), hex(t.StartOfMemoryRange) if hasattr(t, 'StartOfMemoryRange') else 'NO_STACK_RANGE')
