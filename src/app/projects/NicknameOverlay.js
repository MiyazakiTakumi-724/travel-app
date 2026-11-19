"use client";

import { setNickname } from "./actions";
import Modal, { ModalActions } from "@/components/Modal";
import { textFieldClass } from "@/components/ui";
import { LIMITS } from "@/lib/limits";

export default function NicknameOverlay() {
  return (
    <Modal title="ニックネームを設定してください" description="ほかのメンバーに表示される名前です。">
      <form action={setNickname} className="flex flex-col gap-5">
        <input
          type="text"
          name="nickname"
          required
          maxLength={LIMITS.nickname}
          aria-label="ニックネーム"
          className={textFieldClass}
          placeholder="例：たろう"
        />
        <ModalActions submitLabel="決定する" />
      </form>
    </Modal>
  );
}
