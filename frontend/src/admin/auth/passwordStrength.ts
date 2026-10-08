/**
 * Password strength checker matching Django backend validators:
 * - Minimum 12 characters (Django AUTH_PASSWORD_VALIDATORS / custom rules)
 * - Mix of uppercase, lowercase, numbers, and symbols
 */
export interface PasswordRule {
  id: string;
  label: string;
  valid: boolean;
}

export interface PasswordScore {
  score: number; // 0 to 4
  label: string;
  color: string;
  rules: PasswordRule[];
}

export function evaluatePassword(password: string, confirmPassword?: string): PasswordScore {
  const rules: PasswordRule[] = [
    {
      id: 'length',
      label: 'Tối thiểu 12 ký tự',
      valid: password.length >= 12
    },
    {
      id: 'cases',
      label: 'Bao gồm chữ hoa và chữ thường',
      valid: /[a-z]/.test(password) && /[A-Z]/.test(password)
    },
    {
      id: 'number',
      label: 'Có ít nhất 1 chữ số',
      valid: /[0-9]/.test(password)
    },
    {
      id: 'symbol',
      label: 'Có ký tự đặc biệt (!@#$%^&*...)',
      valid: /[^a-zA-Z0-9]/.test(password)
    }
  ];

  if (confirmPassword !== undefined) {
    rules.push({
      id: 'match',
      label: 'Mật khẩu nhập lại trùng khớp',
      valid: password.length > 0 && password === confirmPassword
    });
  }

  const passedCount = rules.filter((r) => r.valid).length;
  const total = rules.length;
  const ratio = passedCount / total;

  let score = 0;
  let label = 'Rất yếu';
  let color = 'bg-red-500';

  if (!password) {
    score = 0;
    label = '';
    color = 'bg-slate-200';
  } else if (ratio < 0.4) {
    score = 1;
    label = 'Yếu';
    color = 'bg-red-500';
  } else if (ratio < 0.7) {
    score = 2;
    label = 'Trung bình';
    color = 'bg-amber-500';
  } else if (ratio < 1) {
    score = 3;
    label = 'Khá mạnh';
    color = 'bg-blue-500';
  } else {
    score = 4;
    label = 'Rất an toàn';
    color = 'bg-emerald-500';
  }

  return { score, label, color, rules };
}
