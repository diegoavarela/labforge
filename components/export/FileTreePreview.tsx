"use client";

import { useState, useMemo } from "react";
import { ChevronRight, ChevronDown, File, Folder } from "lucide-react";
import type { PluginFile } from "@/lib/generator/plugin";

interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children: TreeNode[];
  file?: PluginFile;
}

function buildTree(files: PluginFile[]): TreeNode[] {
  const root: TreeNode = { name: "", path: "", isDir: true, children: [] };

  for (const file of files) {
    const parts = file.path.split("/");
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const childPath = parts.slice(0, i + 1).join("/");

      let child = current.children.find((c) => c.name === part);
      if (!child) {
        child = {
          name: part,
          path: childPath,
          isDir: !isLast,
          children: [],
          file: isLast ? file : undefined,
        };
        current.children.push(child);
      }
      current = child;
    }
  }

  // Sort: dirs first, then alphabetical
  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (const n of nodes) {
      if (n.children.length > 0) sortNodes(n.children);
    }
  };
  sortNodes(root.children);

  return root.children;
}

interface TreeItemProps {
  node: TreeNode;
  depth: number;
  selectedPath: string | null;
  onSelect: (file: PluginFile) => void;
  expandedDirs: Set<string>;
  toggleDir: (path: string) => void;
}

function TreeItem({ node, depth, selectedPath, onSelect, expandedDirs, toggleDir }: TreeItemProps) {
  const isExpanded = expandedDirs.has(node.path);

  if (node.isDir) {
    return (
      <div>
        <button
          onClick={() => toggleDir(node.path)}
          className="flex items-center gap-1.5 w-full text-left py-0.5 hover:bg-bg-tertiary px-1 text-sm font-mono text-text-secondary cursor-pointer"
          style={{ paddingLeft: `${depth * 16 + 4}px` }}
        >
          {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          <Folder size={12} className="text-accent-command" />
          <span>{node.name}/</span>
        </button>
        {isExpanded &&
          node.children.map((child) => (
            <TreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
              expandedDirs={expandedDirs}
              toggleDir={toggleDir}
            />
          ))}
      </div>
    );
  }

  const isSelected = selectedPath === node.path;
  return (
    <button
      onClick={() => node.file && onSelect(node.file)}
      className={`flex items-center gap-1.5 w-full text-left py-0.5 px-1 text-sm font-mono cursor-pointer ${
        isSelected ? "bg-bg-tertiary text-text-primary" : "text-text-secondary hover:bg-bg-tertiary"
      }`}
      style={{ paddingLeft: `${depth * 16 + 4}px` }}
    >
      <span className="w-3" />
      <File size={12} className="text-text-muted" />
      <span>{node.name}</span>
    </button>
  );
}

interface FileTreePreviewProps {
  files: PluginFile[];
  selectedFile: PluginFile | null;
  onSelectFile: (file: PluginFile) => void;
}

export default function FileTreePreview({ files, selectedFile, onSelectFile }: FileTreePreviewProps) {
  const tree = useMemo(() => buildTree(files), [files]);

  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(() => {
    // Expand all dirs by default
    const dirs = new Set<string>();
    for (const file of files) {
      const parts = file.path.split("/");
      for (let i = 1; i < parts.length; i++) {
        dirs.add(parts.slice(0, i).join("/"));
      }
    }
    return dirs;
  });

  const toggleDir = (path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  return (
    <div className="py-1">
      {tree.map((node) => (
        <TreeItem
          key={node.path}
          node={node}
          depth={0}
          selectedPath={selectedFile?.path ?? null}
          onSelect={onSelectFile}
          expandedDirs={expandedDirs}
          toggleDir={toggleDir}
        />
      ))}
      {files.length === 0 && (
        <p className="text-text-muted text-sm p-4 text-center">
          No files to preview. Add skills, agents, or MCPs first.
        </p>
      )}
    </div>
  );
}
