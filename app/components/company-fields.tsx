"use client";

import { SELF_SERVICE_COMPANY_TYPES, type CompanyType } from "../lib/company";
import { inputClass, labelClass } from "./form-styles";
import { useAccountDict } from "../account/i18n/context";

type CompanyFieldsProps = {
  name: string;
  onNameChange: (name: string) => void;
  companyType: CompanyType;
  onCompanyTypeChange: (companyType: CompanyType) => void;
};

export function CompanyFields({
  name,
  onNameChange,
  companyType,
  onCompanyTypeChange,
}: CompanyFieldsProps) {
  const dict = useAccountDict();

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="company-name" className={labelClass}>
          {dict.companyFields.nameLabel}
        </label>
        <input
          id="company-name"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          required
          autoComplete="organization"
          className={inputClass}
        />
      </div>

      <fieldset>
        <legend className={labelClass}>{dict.companyFields.typeLabel}</legend>
        <div className="mt-2 grid gap-2">
          {SELF_SERVICE_COMPANY_TYPES.map((type) => (
            <label
              key={type}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition ${
                companyType === type
                  ? "border-brand-600 ring-1 ring-brand-600"
                  : "border-border-low hover:bg-accent"
              }`}
            >
              <input
                type="radio"
                name="company_type"
                value={type}
                checked={companyType === type}
                onChange={() => onCompanyTypeChange(type)}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-semibold text-foreground">
                  {dict.roles[type]}
                </span>
                <span className="block text-xs leading-relaxed text-muted">
                  {dict.roleDescriptions[type]}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
