/** Optional Male/Female picker for the add-player forms. Left blank, a new
 * player has no gender on file and a returning player keeps theirs. */
export function GenderField({ compact = false }: { compact?: boolean }) {
  return (
    <div>
      <label className={`mb-1 block font-medium text-brand ${compact ? "text-xs" : "text-sm"}`}>Gender</label>
      <select
        name="gender"
        defaultValue=""
        className={`w-full rounded border border-black/15 bg-white text-sm ${compact ? "px-2 py-1.5" : "px-3 py-2"}`}
      >
        <option value="">Not set</option>
        <option value="Male">Male</option>
        <option value="Female">Female</option>
      </select>
    </div>
  );
}
