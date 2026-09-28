import { useId, useState, type ChangeEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Item } from "../../../shared/contracts";
import { householdKey } from "../../shared/api/queryKeys";
import { ApiError } from "../../shared/api/request";
import { useErrorSnackbar } from "../../shared/ui/Snackbar/useErrorSnackbar";
import { Button } from "../../shared/ui/Button/Button";
import { listApi } from "./listApi";

export function ItemPhoto({
  item,
  onBusyChange,
}: {
  item: Item;
  onBusyChange: (busy: boolean) => void;
}) {
  const client = useQueryClient();
  const hintId = useId();
  const choicesId = useId();
  const [hasPhoto, setHasPhoto] = useState(item.hasPhoto);
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useErrorSnackbar(error);

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    setChoosing(false);
    if (!file) return;
    setError(null);
    if (file.size > 12 * 1024 * 1024) {
      setError("Das Foto darf höchstens 12 MB groß sein.");
      return;
    }
    setBusy(true);
    onBusyChange(true);
    try {
      await listApi.uploadPhoto(item.id, file);
      setHasPhoto(true);
      setVersion((current) => current + 1);
      await client.invalidateQueries({ queryKey: householdKey });
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "Das Foto konnte nicht hochgeladen werden. Bitte versuche es erneut.",
      );
    } finally {
      setBusy(false);
      onBusyChange(false);
    }
  }
  async function remove() {
    setError(null);
    setBusy(true);
    onBusyChange(true);
    try {
      await listApi.removePhoto(item.id);
      setHasPhoto(false);
      setChoosing(false);
      await client.invalidateQueries({ queryKey: householdKey });
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "Das Foto konnte nicht entfernt werden.",
      );
    } finally {
      setBusy(false);
      onBusyChange(false);
    }
  }
  const url = `/api/items/${item.id}/photo?v=${version}`;
  return (
    <div className="item-photo-field">
      <span className="item-photo-label">Foto</span>
      {hasPhoto ? (
        <img src={url} alt={`Foto zu ${item.name}`} className="item-photo-image" />
      ) : null}
      <div className="item-photo-actions">
        {hasPhoto ? (
          <Button variant="secondary" disabled={busy} onClick={remove}>
            Foto entfernen
          </Button>
        ) : null}
        <Button
          variant={hasPhoto ? "secondary" : "primary"}
          disabled={busy}
          aria-expanded={choosing}
          aria-controls={choosing ? choicesId : undefined}
          onClick={() => setChoosing((value) => !value)}
        >
          {hasPhoto ? "Anderes Foto wählen" : "Foto wählen"}
        </Button>
      </div>
      {choosing ? (
        <div className="item-photo-choices" id={choicesId} role="group" aria-label="Fotoquelle">
          <label className="item-photo-picker">
            <span>Foto aufnehmen</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              aria-describedby={hintId}
              disabled={busy}
              onChange={upload}
            />
          </label>
          <label className="item-photo-picker">
            <span>Foto auswählen</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
              aria-describedby={hintId}
              disabled={busy}
              onChange={upload}
            />
          </label>
        </div>
      ) : null}
      {busy ? (
        <span className="item-photo-status" role="status">
          Foto wird verarbeitet…
        </span>
      ) : null}
      <span className="item-photo-hint" id={hintId}>
        JPEG, PNG, WebP oder HEIC · max. 12 MB.
      </span>
    </div>
  );
}
