from minidump.minidumpfile import MinidumpFile
from pathlib import Path

dump_path = Path(r"D:\pythonprojects\koydo_loom\artifacts\crash-dumps\KoydoLoom-Win64-Shipping.exe.123520.dmp")
mdmp = MinidumpFile.parse(str(dump_path))
print('EXCEPTION_STREAM_PRESENT', mdmp.exception is not None)
if mdmp.exception:
    exc = mdmp.exception.exception_record
    print('EXCEPTION_CODE', hex(exc.exception_code))
    print('EXCEPTION_FLAGS', exc.exception_flags)
    print('EXCEPTION_ADDRESS', hex(exc.exception_address))
    print('THREAD_ID', mdmp.exception.thread_id)
print('MODULE_COUNT', len(mdmp.modules.modules))
for mod in mdmp.modules.modules[:40]:
    print('MODULE', hex(mod.baseaddress), hex(mod.endaddress), mod.name)
