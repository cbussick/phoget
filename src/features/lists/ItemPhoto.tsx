import { useId, useLayoutEffect, useRef, useState, type ChangeEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Item } from "../../../shared/contracts";
import { householdKey } from "../../shared/api/queryKeys";
import { ApiError } from "../../shared/api/request";
import { useErrorSnackbar } from "../../shared/ui/Snackbar/useErrorSnackbar";
import { Button } from "../../shared/ui/Button/Button";
import { Icon } from "../../shared/ui/Icon/Icon";
import { useAnchoredPopup } from "../../shared/ui/OptionList/useAnchoredPopup";
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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const trash = useRef<HTMLButtonElement>(null);
  const cancelDelete = useRef<HTMLButtonElement>(null);
  const restoreAfterRemoval = useRef(false);
  const [error, setError] = useState<string | null>(null);
  useErrorSnackbar(error);
  useAnchoredPopup(choosing && !busy, trigger, popup, false, true);
  useLayoutEffect(() => {
    if (confirmDelete) cancelDelete.current?.focus();
  }, [confirmDelete]);
  useLayoutEffect(() => {
    if (!busy && !hasPhoto && restoreAfterRemoval.current) {
      restoreAfterRemoval.current = false;
      trigger.current?.focus();
    }
  }, [busy, hasPhoto]);

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setChoosing(false);
    setError(null);
    if (file.size > 12 * 1024 * 1024) {
      setError("Das Foto darf höchstens 12 MB groß sein.");
      requestAnimationFrame(() => trigger.current?.focus());
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
      requestAnimationFrame(() => trigger.current?.focus());
    }
  }
  async function remove() {
    setError(null);
    setBusy(true);
    onBusyChange(true);
    let removed = false;
    try {
      await listApi.removePhoto(item.id);
      setHasPhoto(false);
      setChoosing(false);
      setConfirmDelete(false);
      await client.invalidateQueries({ queryKey: householdKey });
      removed = true;
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "Das Foto konnte nicht entfernt werden.",
      );
    } finally {
      setBusy(false);
      onBusyChange(false);
      if (removed) restoreAfterRemoval.current = true;
    }
  }
  const url = `/api/items/${item.id}/photo?v=${version}`;
  return (
    <div className="item-photo-field">
      <span className="item-photo-label">Foto</span>
      {hasPhoto ? (
        <div className="item-photo-preview">
          <img src={url} alt={`Foto zu ${item.name}`} className="item-photo-image" />
          <Button
            ref={trash}
            variant="secondary"
            size="icon"
            className="item-photo-remove"
            aria-label="Foto entfernen"
            aria-expanded={confirmDelete}
            disabled={busy}
            onClick={() => {
              setChoosing(false);
              setConfirmDelete(true);
            }}
          >
            <Icon name="trash" />
          </Button>
        </div>
      ) : null}
      {confirmDelete ? (
        <div className="item-photo-confirm" role="group" aria-label="Foto entfernen bestätigen">
          <span>Foto wirklich entfernen?</span>
          <div className="item-photo-actions">
            <Button
              ref={cancelDelete}
              variant="secondary"
              disabled={busy}
              onClick={() => {
                setConfirmDelete(false);
                trash.current?.focus();
              }}
            >
              Abbrechen
            </Button>
            <Button variant="danger" disabled={busy} onClick={remove}>
              Foto entfernen
            </Button>
          </div>
        </div>
      ) : (
        <Button
          ref={trigger}
          variant={hasPhoto ? "secondary" : "primary"}
          disabled={busy}
          aria-expanded={choosing}
          aria-controls={choosing ? choicesId : undefined}
          onClick={() => setChoosing((value) => !value)}
        >
          {hasPhoto ? "Anderes Foto wählen" : "Foto wählen"}
        </Button>
      )}
      {choosing && !busy ? (
        <div
          ref={popup}
          className="item-photo-choices"
          id={choicesId}
          role="group"
          aria-label="Fotoquelle"
          popover="auto"
          onToggle={(event) => {
            if (event.newState === "closed") setChoosing(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              setChoosing(false);
              trigger.current?.focus();
            }
          }}
        >
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
