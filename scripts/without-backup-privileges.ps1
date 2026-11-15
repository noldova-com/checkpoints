# @license
# Copyright (c) Noldova.
#
# This source code is licensed under the license found in the
# LICENSE file in the root directory of this source tree.

$Program = $args[0]
$Arguments = @($args | Select-Object -Skip 1)

$ErrorActionPreference = 'Stop'

Add-Type -TypeDefinition @'
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;

public static class TokenPrivileges
{
  [StructLayout(LayoutKind.Sequential, Pack = 4)]
  private struct LuidAndAttributes
  {
    public long Luid;
    public uint Attributes;
  }

  [StructLayout(LayoutKind.Sequential, Pack = 4)]
  private struct OnePrivilege
  {
    public uint Count;
    public LuidAndAttributes Privilege;
  }

  private const uint AdjustPrivileges = 0x0020;
  private const uint Query = 0x0008;
  private const int Success = 0;
  private const int NotAllAssigned = 1300;

  [DllImport("advapi32.dll", SetLastError = true)]
  private static extern bool OpenProcessToken(IntPtr process, uint access, out IntPtr token);

  [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
  private static extern bool LookupPrivilegeValue(string system, string name, out long luid);

  [DllImport("advapi32.dll", SetLastError = true)]
  private static extern bool AdjustTokenPrivileges(IntPtr token, bool disableAll, ref OnePrivilege state, uint length, IntPtr previous, IntPtr returned);

  [DllImport("kernel32.dll")]
  private static extern IntPtr GetCurrentProcess();

  [DllImport("kernel32.dll", SetLastError = true)]
  private static extern bool CloseHandle(IntPtr handle);

  public static void Disable(string name)
  {
    IntPtr token;
    if (!OpenProcessToken(GetCurrentProcess(), AdjustPrivileges | Query, out token))
      throw new Win32Exception();
    try
    {
      long luid;
      if (!LookupPrivilegeValue(null, name, out luid))
        throw new Win32Exception();
      OnePrivilege state = new OnePrivilege { Count = 1, Privilege = new LuidAndAttributes { Luid = luid, Attributes = 0 } };
      if (!AdjustTokenPrivileges(token, false, ref state, 0, IntPtr.Zero, IntPtr.Zero))
        throw new Win32Exception();
      int error = Marshal.GetLastWin32Error();
      if (error != Success && error != NotAllAssigned)
        throw new Win32Exception(error);
    }
    finally
    {
      CloseHandle(token);
    }
  }
}
'@

[TokenPrivileges]::Disable('SeBackupPrivilege')
[TokenPrivileges]::Disable('SeRestorePrivilege')
& $Program @Arguments
exit $LASTEXITCODE
