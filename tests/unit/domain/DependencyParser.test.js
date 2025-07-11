import DependencyParser from '../../../src/domain/DependencyParser';

describe('DependencyParser', () => {
  let parser;

  beforeEach(() => {
    parser = new DependencyParser();
  });

  describe('parse', () => {
    it('should parse "depends on #123" format', () => {
      const text = 'This task depends on #123';
      const dependencies = parser.parse(text);

      expect(dependencies).toEqual([
        { type: 'finish-to-start', targetId: '123' }
      ]);
    });

    it('should parse "blocked by #456" format', () => {
      const text = 'This task is blocked by #456';
      const dependencies = parser.parse(text);

      expect(dependencies).toEqual([
        { type: 'finish-to-start', targetId: '456' }
      ]);
    });

    it('should parse multiple dependencies', () => {
      const text = 'This task depends on #123 and is blocked by #456';
      const dependencies = parser.parse(text);

      expect(dependencies).toEqual([
        { type: 'finish-to-start', targetId: '123' },
        { type: 'finish-to-start', targetId: '456' }
      ]);
    });

    it('should handle various formats', () => {
      const text = `
        Depends on: #123
        Blocked by: #456
        depends on #789
        DEPENDS ON #101
      `;
      const dependencies = parser.parse(text);

      expect(dependencies).toHaveLength(4);
      expect(dependencies.map(d => d.targetId)).toEqual(['123', '789', '101', '456']);
    });

    it('should parse with colon separator', () => {
      const text = 'depends on: #123, #456';
      const dependencies = parser.parse(text);

      expect(dependencies).toEqual([
        { type: 'finish-to-start', targetId: '123' },
        { type: 'finish-to-start', targetId: '456' }
      ]);
    });

    it('should handle GitHub issue URLs', () => {
      const text = 'This depends on https://github.com/org/repo/issues/123';
      const dependencies = parser.parse(text);

      expect(dependencies).toEqual([
        { type: 'finish-to-start', targetId: '123' }
      ]);
    });

    it('should return empty array for no dependencies', () => {
      const text = 'This is a regular task description';
      const dependencies = parser.parse(text);

      expect(dependencies).toEqual([]);
    });

    it('should ignore code blocks', () => {
      const text = `
        This task description
        \`\`\`
        // This is code, not a dependency: depends on #999
        \`\`\`
        But this depends on #123
      `;
      const dependencies = parser.parse(text);

      expect(dependencies).toEqual([
        { type: 'finish-to-start', targetId: '123' }
      ]);
    });

    it('should handle cross-references format', () => {
      const text = 'Related to #123 but depends on #456';
      const dependencies = parser.parse(text);

      // Should only pick up explicit dependencies
      expect(dependencies).toEqual([
        { type: 'finish-to-start', targetId: '456' }
      ]);
    });
  });

  describe('parseAdvanced', () => {
    it('should parse different dependency types', () => {
      const text = `
        finish-to-start: #123
        start-to-start: #456
        finish-to-finish: #789
        start-to-finish: #101
      `;
      const dependencies = parser.parseAdvanced(text);

      expect(dependencies).toEqual([
        { type: 'finish-to-start', targetId: '123' },
        { type: 'start-to-start', targetId: '456' },
        { type: 'finish-to-finish', targetId: '789' },
        { type: 'start-to-finish', targetId: '101' }
      ]);
    });

    it('should default to finish-to-start for basic format', () => {
      const text = 'depends on #123';
      const dependencies = parser.parseAdvanced(text);

      expect(dependencies).toEqual([
        { type: 'finish-to-start', targetId: '123' }
      ]);
    });
  });

  describe('extractFromIssueBody', () => {
    it('should handle full GitHub issue body', () => {
      const issueBody = `
        ## Description
        This is a task to implement authentication

        ## Dependencies
        - Depends on #123 (API design)
        - Blocked by #456 (Database schema)

        ## Acceptance Criteria
        - [ ] User can log in
        - [ ] User can log out
      `;

      const dependencies = parser.extractFromIssueBody(issueBody);

      expect(dependencies).toEqual([
        { type: 'finish-to-start', targetId: '123' },
        { type: 'finish-to-start', targetId: '456' }
      ]);
    });

    it('should handle issue body with no dependencies', () => {
      const issueBody = `
        ## Description
        This is a standalone task
      `;

      const dependencies = parser.extractFromIssueBody(issueBody);

      expect(dependencies).toEqual([]);
    });
  });
});