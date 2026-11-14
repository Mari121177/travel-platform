// The DTOs count characters (code points). Mongoose's maxlength counts UTF-16
// units, so an emoji text could pass the DTO and then fail on save (500).
// This validator counts code points too, so both layers agree.
export const maxCharacters = (max: number) => ({
  validator: (value: string) => Array.from(value).length <= max,
  message: `must be at most ${max} characters`,
});