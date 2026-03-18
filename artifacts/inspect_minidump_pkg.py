import minidump, pkgutil, os
print(minidump.__file__)
for m in pkgutil.walk_packages(minidump.__path__, minidump.__name__ + '.'):
    if 'walk' in m.name.lower() or 'stack' in m.name.lower() or 'thread' in m.name.lower() or 'unwind' in m.name.lower():
        print(m.name)
