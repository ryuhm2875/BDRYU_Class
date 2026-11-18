"""UAL1 + UAL2 -> 필요한 동작만 담은 작은 GLB 두 개 (남/여 마네킹)"""
import json, struct, sys, glob
def load(f):
    b = open(f, 'rb').read(); l = struct.unpack('<I', b[12:16])[0]
    J = json.loads(b[20:20+l]); off = 20 + l
    bl = struct.unpack('<I', b[off:off+4])[0]; return J, b[off+8:off+8+bl]

class Out:
    def __init__(s): s.bin = bytearray(); s.bv = []; s.acc = []
    def view(s, data, target=None):
        while len(s.bin) % 4: s.bin += b'\0'
        v = {"buffer": 0, "byteOffset": len(s.bin), "byteLength": len(data)}
        if target: v["target"] = target
        s.bin += data; s.bv.append(v); return len(s.bv) - 1
    def acc_from(s, J, B, i, target=None):
        a = dict(J['accessors'][i]); v = J['bufferViews'][a['bufferView']]
        comp = {5120:1,5121:1,5122:2,5123:2,5125:4,5126:4}[a['componentType']]
        n = {"SCALAR":1,"VEC2":2,"VEC3":3,"VEC4":4,"MAT4":16}[a['type']]
        es = comp * n; st = v.get('byteStride', es); o = v.get('byteOffset', 0) + a.get('byteOffset', 0)
        data = b''.join(B[o + k*st: o + k*st + es] for k in range(a['count'])) if st != es else B[o:o + es*a['count']]
        a['bufferView'] = s.view(data, target); a.pop('byteOffset', None)
        s.acc.append(a); return len(s.acc) - 1

def pack(meshsrc, animsrcs, keep, out_path, drop_fingers=True):
    J, B = load(meshsrc); O = Out()
    names = [n.get('name') for n in J['nodes']]
    G = {"asset": {"version": "2.0", "generator": "bongdoo-pack"}, "scene": 0, "scenes": J['scenes'],
         "nodes": J['nodes'], "materials": J['materials'], "skins": [], "meshes": [], "animations": []}
    for m in J['meshes']:
        prims = []
        for p in m['primitives']:
            q = {"attributes": {k: O.acc_from(J, B, v, 34962) for k, v in p['attributes'].items() if k != 'TEXCOORD_1' and k != 'TEXCOORD_0'},
                 "material": p['material']}
            if 'indices' in p: q['indices'] = O.acc_from(J, B, p['indices'], 34963)
            prims.append(q)
        G['meshes'].append({"name": m['name'], "primitives": prims})
    for sk in J['skins']:
        k = dict(sk); k['inverseBindMatrices'] = O.acc_from(J, B, sk['inverseBindMatrices']); G['skins'].append(k)
    finger = ('index_', 'middle_', 'pinky_', 'ring_', 'thumb_')
    for src in animsrcs:
        A, AB = load(src); an = [n.get('name') for n in A['nodes']]
        for anim in A.get('animations', []):
            if anim['name'] not in keep: continue
            samp, ch, memo = [], [], {}
            for c in anim['channels']:
                nm = an[c['target']['node']]
                if drop_fingers and nm.startswith(finger): continue
                if nm not in names: continue
                s = anim['samplers'][c['sampler']]
                key = (s['input'], s['output'], s.get('interpolation', 'LINEAR'))
                if key not in memo:
                    inp = memo.get(('in', s['input'])) 
                    if inp is None: inp = memo[('in', s['input'])] = O.acc_from(A, AB, s['input'])
                    samp.append({"input": inp, "output": O.acc_from(A, AB, s['output']), "interpolation": key[2]}); memo[key] = len(samp) - 1
                ch.append({"sampler": memo[key], "target": {"node": names.index(nm), "path": c['target']['path']}})
            G['animations'].append({"name": keep[anim['name']], "samplers": samp, "channels": ch})
    G['accessors'] = O.acc; G['bufferViews'] = O.bv; G['buffers'] = [{"byteLength": len(O.bin)}]
    js = json.dumps(G, separators=(',', ':')).encode()
    js += b' ' * ((4 - len(js) % 4) % 4); bn = bytes(O.bin) + b'\0' * ((4 - len(O.bin) % 4) % 4)
    tot = 12 + 8 + len(js) + 8 + len(bn)
    with open(out_path, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, tot)); f.write(struct.pack('<II', len(js), 0x4E4F534A)); f.write(js)
        f.write(struct.pack('<II', len(bn), 0x004E4942)); f.write(bn)
    print(out_path, tot // 1024, 'KB', [a['name'] for a in G['animations']])

U1 = glob.glob('/tmp/dl/ual1/**/UAL1_Standard.glb', recursive=True)[0]
U2 = glob.glob('/tmp/dl/66a3*/**/UAL2_Standard.glb', recursive=True)[0]
MF = glob.glob('/tmp/dl/66a3*/**/Mannequin_F.glb', recursive=True)[0]
KEEP = {"Idle_Loop": "idle", "Walk_Loop": "walk", "Jog_Fwd_Loop": "run", "Crouch_Idle_Loop": "crouch", "Crouch_Fwd_Loop": "crouchWalk",
        "Idle_Talking_Loop": "talk", "Idle_Torch_Loop": "torch", "Hit_Chest": "hit", "Interact": "interact", "PickUp_Table": "pick",
        "Zombie_Walk_Fwd_Loop": "zWalk", "Zombie_Idle_Loop": "zIdle", "Zombie_Scratch": "zScratch", "LayToIdle": "getUp",
        "Idle_Lantern_Loop": "lantern", "Idle_TalkingPhone_Loop": "phone", "Idle_FoldArms_Loop": "foldArms",
        "Idle_Shield_Loop": "guard", "Hit_Knockback": "knock", "Idle_No_Loop": "no", "Yes": "yes"}
out = sys.argv[1]
pack(U1, [U1, U2], KEEP, out + '/people_m.glb')
pack(MF, [], {}, out + '/people_f.glb')
