"use client";

import { deletePesertaAction } from "../peserta/actions";
import { btnDanger } from "@/components/ui";

export default function DeleteParticipantButton({ id, name }: { id: number; name: string }) {
  return (
    <form
      action={deletePesertaAction}
      className="mt-1.5"
      onSubmit={(event) => {
        if (!window.confirm(`Hapus peserta ${name}?`)) event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="return_to" value="dashboard" />
      <button className={btnDanger} type="submit">Hapus</button>
    </form>
  );
}
