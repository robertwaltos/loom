from minidump.minidumpfile import MinidumpFile
from pathlib import Path

dump_path = Path(r"D:\pythonprojects\koydo_loom\artifacts\crash-dumps\KoydoLoom-Win64-Shipping.exe.123520.dmp")
mdmp = MinidumpFile.parse(str(dump_path))
print('THREADS_ATTRS', dir(mdmp.threads.threads[0]))
for t in mdmp.threads.threads[:3]:
    print('THREADID', t.ThreadId)
    for attr in ['Teb','Stack','StackStartOfMemoryRange','StackMemory','SuspendCount','PriorityClass','Priority']:
        print(attr, getattr(t, attr, None))
