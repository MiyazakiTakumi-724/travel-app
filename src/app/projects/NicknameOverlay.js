"use client";

import { setNickname } from "./actions";
import Modal, { SubmitButton } from "@/components/Modal";
import { textFieldClass } from "@/components/ui";

export default function NicknameOverlay() {
  return (
    <Modal title="ニックネーム">
      <form action={setNickname} className="flex flex-col gap-5">
        <input
          type="text"
          name="nickname"
          required
          maxLength={20}
          aria-label="ニックネーム"
          className={`${textFieldClass} text-lg font-bold`}
          placeholder="例：たろう"
        />
        <SubmitButton>決定</SubmitButton>
      </form>
    </Modal>
  );
}
