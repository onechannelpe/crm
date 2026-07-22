export interface Topic {
  of(id: string): string;
  parse(topic: string): string | null;
}

export function defineTopic(prefix: string): Topic {
  const head = `${prefix}.`;

  return {
    of: (id) => `${head}${id}`,

    parse: (topic) => {
      if (!topic.startsWith(head)) {
        return null;
      }

      const id = topic.slice(head.length);

      return id.trim().length === 0 ? null : id;
    },
  };
}
