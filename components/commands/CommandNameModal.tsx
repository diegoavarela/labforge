"use client";

import { useState, useCallback } from "react";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { usePluginStore } from "@/stores/plugin";

interface CommandNameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}

export default function CommandNameModal({
  isOpen,
  onClose,
  onCreated,
}: CommandNameModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const addCommand = usePluginStore((s) => s.addCommand);

  const handleCreate = useCallback(() => {
    if (!name.trim()) return;
    const cmdName = name.startsWith("/") ? name : `/${name}`;
    const id = `cmd-${Date.now()}`;
    addCommand({
      id,
      name: cmdName,
      description,
      nodes: [
        {
          id: "start-1",
          type: "start",
          position: { x: 250, y: 50 },
          data: { label: "START", commandName: cmdName },
        },
      ],
      edges: [],
    });
    setName("");
    setDescription("");
    onCreated(id);
    onClose();
  }, [name, description, addCommand, onCreated, onClose]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Command">
      <div className="flex flex-col gap-3">
        <Input
          label="Command Name"
          value={name}
          onChange={setName}
          placeholder="/deploy"
        />
        <Input
          label="Description"
          value={description}
          onChange={setDescription}
          placeholder="What does this command do?"
        />
        <div className="flex justify-end gap-2 mt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleCreate}
            disabled={!name.trim()}
            color="#22c55e"
          >
            Create
          </Button>
        </div>
      </div>
    </Modal>
  );
}
