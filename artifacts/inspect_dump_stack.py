from minidump.minidumpfile import MinidumpFile

DUMP = r"D:\pythonprojects\koydo_loom\artifacts\crash-dumps\KoydoLoom-Win64-Shipping.exe.123520.dmp"
mdmp = MinidumpFile.parse(DUMP)
reader = mdmp.get_reader()
exc = mdmp.exception.exception_records[0]
crash_tid = exc.ThreadId
thread = next(t for t in mdmp.threads.threads if t.ThreadId == crash_tid)
ctx = thread.ContextObject
rip = ctx.Rip
rsp = ctx.Rsp
print('CRASH_THREAD', crash_tid)
print('RIP', hex(rip))
print('RSP', hex(rsp))

def module_for(addr):
    for mod in mdmp.modules.modules:
        if mod.baseaddress <= addr < mod.endaddress:
            return mod
    return None

mod = module_for(rip)
print('RIP_MODULE', mod.name if mod else None, hex(rip - mod.baseaddress) if mod else None)

vals = []
for i in range(0, 40):
    try:
        data = reader.read(rsp + i*8, 8)
        val = int.from_bytes(data, 'little', signed=False)
        vals.append(val)
    except Exception as e:
        print('STACK_READ_ERROR', i, repr(e))
        break
for i, val in enumerate(vals):
    mod = module_for(val)
    if mod:
        print('STACK', i, hex(val), mod.name, hex(val - mod.baseaddress))
    else:
        print('STACK', i, hex(val), 'NO_MODULE')
