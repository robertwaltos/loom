from minidump.minidumpfile import MinidumpFile
from pathlib import Path

dump_path = Path(r"D:\pythonprojects\koydo_loom\artifacts\crash-dumps\KoydoLoom-Win64-Shipping.exe.123520.dmp")
mdmp = MinidumpFile.parse(str(dump_path))
print(type(mdmp.exception))
print(dir(mdmp.exception))
print('RECORD_COUNT', len(mdmp.exception.exception_records))
for i, rec in enumerate(mdmp.exception.exception_records[:5]):
    print('REC', i)
    for name in ['thread_id','exception_code','exception_flags','exception_address','number_parameters']:
        print(name, getattr(rec, name, None))
    print(rec)
