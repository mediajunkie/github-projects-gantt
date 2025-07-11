export default class DependencyParser {
  constructor() {
    // Basic patterns for dependency detection
    this.patterns = {
      dependsOn: /depends?\s+on:?\s*#(\d+)/gi,
      blockedBy: /blocked\s+by:?\s*#(\d+)/gi,
      githubUrl: /depends?\s+on\s+https:\/\/github\.com\/[\w-]+\/[\w-]+\/issues\/(\d+)/gi,
      // Advanced patterns for specific dependency types
      finishToStart: /finish-to-start:?\s*#(\d+)/gi,
      startToStart: /start-to-start:?\s*#(\d+)/gi,
      finishToFinish: /finish-to-finish:?\s*#(\d+)/gi,
      startToFinish: /start-to-finish:?\s*#(\d+)/gi,
    };
  }

  parse(text) {
    const dependencies = [];
    const processedIds = new Set();

    // Remove code blocks to avoid false positives
    const cleanText = this.removeCodeBlocks(text);

    // Handle comma-separated lists (e.g., "depends on: #123, #456")
    const expandedText = this.expandCommaSeparatedIssues(cleanText);

    // Parse basic "depends on" format
    this.extractMatches(expandedText, this.patterns.dependsOn, 'finish-to-start', dependencies, processedIds);
    
    // Parse "blocked by" format
    this.extractMatches(expandedText, this.patterns.blockedBy, 'finish-to-start', dependencies, processedIds);
    
    // Parse GitHub URLs
    this.extractMatches(expandedText, this.patterns.githubUrl, 'finish-to-start', dependencies, processedIds);

    return dependencies;
  }

  parseAdvanced(text) {
    const dependencies = [];
    const processedIds = new Set();

    // Remove code blocks
    const cleanText = this.removeCodeBlocks(text);

    // Check for advanced dependency types first
    this.extractMatches(cleanText, this.patterns.finishToStart, 'finish-to-start', dependencies, processedIds);
    this.extractMatches(cleanText, this.patterns.startToStart, 'start-to-start', dependencies, processedIds);
    this.extractMatches(cleanText, this.patterns.finishToFinish, 'finish-to-finish', dependencies, processedIds);
    this.extractMatches(cleanText, this.patterns.startToFinish, 'start-to-finish', dependencies, processedIds);

    // Fall back to basic parsing for remaining dependencies
    const basicDeps = this.parse(text); // Use original text since parse() will clean it
    for (const dep of basicDeps) {
      if (!processedIds.has(dep.targetId)) {
        dependencies.push(dep);
        processedIds.add(dep.targetId);
      }
    }

    return dependencies;
  }

  extractFromIssueBody(issueBody) {
    // For now, use the basic parse method
    // In the future, this could handle more structured formats
    return this.parse(issueBody);
  }

  removeCodeBlocks(text) {
    // Remove code blocks first (both ``` and indented)
    let cleanText = text.replace(/```[\s\S]*?```/gm, '');
    
    // Remove inline code
    cleanText = cleanText.replace(/`[^`\n]*`/g, '');
    
    // Only remove lines that are clearly code blocks (indented lines that don't contain dependency keywords)
    // This is a more conservative approach to avoid removing valid dependency declarations
    const lines = cleanText.split('\n');
    const filteredLines = lines.filter(line => {
      // If line starts with 4+ spaces AND doesn't contain dependency keywords, treat as code
      const isIndented = /^    /.test(line);
      const hasDependencyKeywords = /depends?\s+on|blocked\s+by|finish-to-start|start-to-start|finish-to-finish|start-to-finish/i.test(line);
      
      // Keep the line if it's not indented OR if it contains dependency keywords
      return !isIndented || hasDependencyKeywords;
    });
    
    return filteredLines.join('\n');
  }

  expandCommaSeparatedIssues(text) {
    // Find patterns like "depends on: #123, #456" and expand them
    const pattern = /(depends?\s+on|blocked\s+by):?\s*(#\d+(?:\s*,\s*#\d+)*)/gi;
    
    return text.replace(pattern, (match, prefix, issues) => {
      // Split by comma and reconstruct
      const issueNumbers = issues.split(',').map(s => s.trim());
      return issueNumbers.map(issue => `${prefix} ${issue}`).join(' ');
    });
  }

  extractMatches(text, pattern, type, dependencies, processedIds) {
    let match;
    pattern.lastIndex = 0; // Reset regex state
    
    while ((match = pattern.exec(text)) !== null) {
      const targetId = match[1];
      if (!processedIds.has(targetId)) {
        dependencies.push({
          type: type,
          targetId: targetId
        });
        processedIds.add(targetId);
      }
    }
  }
}