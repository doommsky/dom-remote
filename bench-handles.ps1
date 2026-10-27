$ErrorActionPreference = 'Stop'

$code = @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;

public static class Bench
{
    const int SystemExtendedHandleInformation = 64;
    const int ObjectTypeInformation = 2;
    const int ObjectNameInformation = 1;
    const uint PROCESS_DUP_HANDLE = 0x0040;
    const uint DUPLICATE_SAME_ACCESS = 0x00000002;

    [StructLayout(LayoutKind.Sequential)]
    struct ENTRY
    {
        public IntPtr Object;
        public IntPtr UniqueProcessId;
        public IntPtr HandleValue;
        public uint GrantedAccess;
        public ushort CreatorBackTraceIndex;
        public ushort ObjectTypeIndex;
        public uint HandleAttributes;
        public uint Reserved;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct BY_HANDLE_FILE_INFORMATION
    {
        public uint dwFileAttributes;
        public System.Runtime.InteropServices.ComTypes.FILETIME ftCreationTime;
        public System.Runtime.InteropServices.ComTypes.FILETIME ftLastAccessTime;
        public System.Runtime.InteropServices.ComTypes.FILETIME ftLastWriteTime;
        public uint dwVolumeSerialNumber;
        public uint nFileSizeHigh;
        public uint nFileSizeLow;
        public uint nNumberOfLinks;
        public uint nFileIndexHigh;
        public uint nFileIndexLow;
    }

    [DllImport("ntdll.dll")] static extern int NtQuerySystemInformation(int c, IntPtr i, int l, out int r);
    [DllImport("ntdll.dll")] static extern int NtQueryObject(IntPtr h, int c, IntPtr i, int l, out int r);
    [DllImport("kernel32.dll", SetLastError = true)] static extern bool DuplicateHandle(IntPtr sp, IntPtr sh, IntPtr tp, out IntPtr th, uint da, bool inh, uint op);
    [DllImport("kernel32.dll")] static extern IntPtr GetCurrentProcess();
    [DllImport("kernel32.dll", SetLastError = true)] static extern bool CloseHandle(IntPtr h);
    [DllImport("kernel32.dll", SetLastError = true)] static extern IntPtr OpenProcess(uint a, bool i, int pid);
    [DllImport("kernel32.dll", SetLastError = true)] static extern bool GetFileInformationByHandle(IntPtr h, out BY_HANDLE_FILE_INFORMATION info);

    static string ReadUS(IntPtr buf)
    {
        ushort len = (ushort)Marshal.ReadInt16(buf, 0);
        IntPtr str = IntPtr.Size == 8 ? Marshal.ReadIntPtr(buf, 8) : new IntPtr(Marshal.ReadInt32(buf, 4));
        if (len == 0 || str == IntPtr.Zero) return null;
        return Marshal.PtrToStringUni(str, len / 2);
    }

    public static string[] Run(int pid)
    {
        var log = new List<string>();
        int len = 0;
        NtQuerySystemInformation(SystemExtendedHandleInformation, IntPtr.Zero, 0, out len);
        IntPtr buf = Marshal.AllocHGlobal(len);
        try
        {
            for (int a = 0; a < 8; a++) {
                int st = NtQuerySystemInformation(SystemExtendedHandleInformation, buf, len, out len);
                if (st == 0) break;
                Marshal.FreeHGlobal(buf); len += (1 << 20); buf = Marshal.AllocHGlobal(len);
            }
            int headerSize = 16;
            int entrySize = Marshal.SizeOf(typeof(ENTRY));
            long count = (len - headerSize) / entrySize;
            log.Add("total system handles: " + count);

            IntPtr self = GetCurrentProcess();
            IntPtr src = OpenProcess(PROCESS_DUP_HANDLE, false, pid);
            log.Add("OpenProcess(PROCESS_DUP_HANDLE) for pid " + pid + ": " + (src == IntPtr.Zero ? "FAILED" : "ok"));

            int n = 0, dupOk = 0, typeOk = 0, nameOk = 0, infoOk = 0;
            var swDup = new System.Diagnostics.Stopwatch();
            var swType = new System.Diagnostics.Stopwatch();
            var swName = new System.Diagnostics.Stopwatch();
            var swInfo = new System.Diagnostics.Stopwatch();
            var typeNames = new Dictionary<ushort,string>();

            for (long i = 0; i < count && n < 300; i++)
            {
                var e = (ENTRY)Marshal.PtrToStructure(IntPtr.Add(buf, headerSize + (int)(i * entrySize)), typeof(ENTRY));
                if (e.UniqueProcessId.ToInt32() != pid) continue;
                n++;

                swDup.Start();
                IntPtr dup;
                bool ok = DuplicateHandle(src, e.HandleValue, self, out dup, 0, false, DUPLICATE_SAME_ACCESS);
                swDup.Stop();
                if (!ok) continue;
                dupOk++;

                try
                {
                    string tn;
                    if (!typeNames.TryGetValue(e.ObjectTypeIndex, out tn))
                    {
                        swType.Start();
                        int tl = 0;
                        int st = NtQueryObject(dup, ObjectTypeInformation, IntPtr.Zero, 0, out tl);
                        if (st == 0 || st == unchecked((int)0xC0000004)) {
                            IntPtr tb = Marshal.AllocHGlobal(tl);
                            try {
                                if (NtQueryObject(dup, ObjectTypeInformation, tb, tl, out tl) == 0) tn = ReadUS(tb);
                            } finally { Marshal.FreeHGlobal(tb); }
                        }
                        swType.Stop();
                        typeNames[e.ObjectTypeIndex] = tn ?? "";
                        if (tn != null && tn != "") typeOk++;
                    }

                    swName.Start();
                    int nl = 0;
                    int st2 = NtQueryObject(dup, ObjectNameInformation, IntPtr.Zero, 0, out nl);
                    if (st2 == 0 || st2 == unchecked((int)0xC0000004)) {
                        IntPtr nb = Marshal.AllocHGlobal(nl);
                        try {
                            if (NtQueryObject(dup, ObjectNameInformation, nb, nl, out nl) == 0) { var s = ReadUS(nb); if (s != null) nameOk++; }
                        } finally { Marshal.FreeHGlobal(nb); }
                    }
                    swName.Stop();

                    swInfo.Start();
                    BY_HANDLE_FILE_INFORMATION inf;
                    if (GetFileInformationByHandle(dup, out inf)) infoOk++;
                    swInfo.Stop();
                }
                finally { CloseHandle(dup); }
            }

            log.Add("handles of pid " + pid + " examined: " + n);
            log.Add("DuplicateHandle ok: " + dupOk + "  total " + swDup.ElapsedMilliseconds + " ms");
            log.Add("type-name queries: " + typeOk + "  total " + swType.ElapsedMilliseconds + " ms");
            log.Add("object-name queries: " + nameOk + "  total " + swName.ElapsedMilliseconds + " ms");
            log.Add("GetFileInformationByHandle ok: " + infoOk + "  total " + swInfo.ElapsedMilliseconds + " ms");
            log.Add("distinct type indices: " + typeNames.Count);
            foreach (var kv in typeNames) log.Add("   idx " + kv.Key + " = '" + kv.Value + "'");
        }
        finally { Marshal.FreeHGlobal(buf); }
        return log.ToArray();
    }
}
'@

Add-Type -TypeDefinition $code -Language CSharp

Write-Output "current pid: $PID"
[Bench]::Run($PID) | ForEach-Object { $_ }
