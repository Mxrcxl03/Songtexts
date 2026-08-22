import { useState } from 'react';

type PasswordInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoComplete?: string;
  id?: string;
  name?: string;
};

export const PasswordInput = ({
  value,
  onChange,
  placeholder = 'Passwort',
  className = 'text-input',
  autoComplete,
  id,
  name,
}: PasswordInputProps) => {
  const [visible, setVisible] = useState(false);
  const toggleLabel = visible ? 'Passwort verbergen' : 'Passwort anzeigen';

  return (
    <div className="password-input-wrapper">
      <input
        id={id}
        name={name}
        className={`${className} password-input`}
        placeholder={placeholder}
        type={visible ? 'text' : 'password'}
        value={value}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
      />
      <button
        type="button"
        className="password-toggle-btn"
        onClick={() => setVisible((current) => !current)}
        aria-label={toggleLabel}
        aria-pressed={visible}
        title={toggleLabel}
      >
        <svg viewBox="0 0 24 24" className="password-toggle-icon" aria-hidden="true">
          {visible ? (
            <path
              fill="currentColor"
              d="M12 5c-4.65 0-8.38 2.32-10.11 6a4.35 4.35 0 0 0 0 4c1.73 3.68 5.46 6 10.11 6s8.38-2.32 10.11-6c.6-1.27.6-2.73 0-4C20.38 7.32 16.65 5 12 5Zm8.3 9.15C18.95 17.12 15.87 19 12 19s-6.95-1.88-8.3-4.85a2.55 2.55 0 0 1 0-2.3C5.05 8.88 8.13 7 12 7s6.95 1.88 8.3 4.85c.34.72.34 1.58 0 2.3ZM12 9a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z"
            />
          ) : (
            <path
              fill="currentColor"
              d="M3.28 2 2 3.27l3.02 3.02C3.7 7.19 2.63 8.43 1.89 10a4.35 4.35 0 0 0 0 4c1.73 3.68 5.46 6 10.11 6 1.7 0 3.27-.31 4.65-.88L20.73 23 22 21.72 3.28 2ZM12 18c-3.87 0-6.95-1.88-8.3-4.85a2.55 2.55 0 0 1 0-2.3 8.7 8.7 0 0 1 2.63-3.23l2.06 2.06A4 4 0 0 0 12 16a3.98 3.98 0 0 0 2.32-.75l1.33 1.33A9.7 9.7 0 0 1 12 18Zm4-6a4 4 0 0 0-5.66-3.63L8.85 6.88A9.57 9.57 0 0 1 12 6c3.87 0 6.95 1.88 8.3 4.85.34.72.34 1.58 0 2.3a8.6 8.6 0 0 1-1.84 2.53l-1.44-1.44c.62-.68.98-1.59.98-2.24Z"
            />
          )}
        </svg>
      </button>
    </div>
  );
};
