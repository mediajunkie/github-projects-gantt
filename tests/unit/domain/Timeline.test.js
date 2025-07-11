import Timeline from '../../../src/domain/Timeline';

describe('Timeline', () => {
  describe('constructor', () => {
    it('should create timeline with default settings', () => {
      const timeline = new Timeline();
      
      expect(timeline.velocityPerWeek).toBe(80); // Default for 10 people * 8 points
      expect(timeline.workingDaysPerWeek).toBe(5);
    });

    it('should create timeline with custom settings', () => {
      const timeline = new Timeline({
        velocityPerWeek: 100,
        workingDaysPerWeek: 4,
        teamSize: 12
      });
      
      expect(timeline.velocityPerWeek).toBe(100);
      expect(timeline.workingDaysPerWeek).toBe(4);
      expect(timeline.teamSize).toBe(12);
    });
  });

  describe('calculateEndDate', () => {
    it('should calculate end date from story points', () => {
      const timeline = new Timeline({ velocityPerWeek: 80 });
      const startDate = new Date(Date.UTC(2024, 0, 1)); // Jan 1, 2024
      
      const endDate = timeline.calculateEndDate(40, startDate);
      
      // 40 points / 80 velocity = 0.5 weeks = 2.5 working days ≈ 3 days
      const expected = new Date(Date.UTC(2024, 0, 4)); // Jan 4, 2024
      expect(endDate).toEqual(expected);
    });

    it('should handle full weeks', () => {
      const timeline = new Timeline({ velocityPerWeek: 80 });
      const startDate = new Date(Date.UTC(2024, 0, 1));
      
      const endDate = timeline.calculateEndDate(160, startDate);
      
      // 160 points / 80 velocity = 2 weeks = 10 working days
      const expected = new Date(Date.UTC(2024, 0, 11)); // Jan 11, 2024
      expect(endDate).toEqual(expected);
    });

    it('should handle fractional weeks', () => {
      const timeline = new Timeline({ velocityPerWeek: 80 });
      const startDate = new Date(Date.UTC(2024, 0, 1));
      
      const endDate = timeline.calculateEndDate(100, startDate);
      
      // 100 points / 80 velocity = 1.25 weeks = 6.25 working days ≈ 6 days
      const expected = new Date(Date.UTC(2024, 0, 7)); // Jan 7, 2024
      expect(endDate).toEqual(expected);
    });

    it('should handle zero story points', () => {
      const timeline = new Timeline({ velocityPerWeek: 80 });
      const startDate = new Date(Date.UTC(2024, 0, 1));
      
      const endDate = timeline.calculateEndDate(0, startDate);
      
      expect(endDate).toEqual(startDate);
    });

    it('should handle working days calculation', () => {
      const timeline = new Timeline({ 
        velocityPerWeek: 80, 
        workingDaysPerWeek: 4 
      });
      const startDate = new Date(Date.UTC(2024, 0, 1));
      
      const endDate = timeline.calculateEndDate(40, startDate);
      
      // 40 points / 80 velocity = 0.5 weeks = 2 working days (4 days/week)
      const expected = new Date(Date.UTC(2024, 0, 3)); // Jan 3, 2024
      expect(endDate).toEqual(expected);
    });
  });

  describe('calculateDuration', () => {
    it('should calculate duration in weeks', () => {
      const timeline = new Timeline({ velocityPerWeek: 80 });
      
      const duration = timeline.calculateDuration(160);
      
      expect(duration).toBe(2); // 160 / 80 = 2 weeks
    });

    it('should handle fractional weeks', () => {
      const timeline = new Timeline({ velocityPerWeek: 80 });
      
      const duration = timeline.calculateDuration(100);
      
      expect(duration).toBe(1.25); // 100 / 80 = 1.25 weeks
    });

    it('should return 0 for zero story points', () => {
      const timeline = new Timeline({ velocityPerWeek: 80 });
      
      const duration = timeline.calculateDuration(0);
      
      expect(duration).toBe(0);
    });
  });

  describe('adjustForDependencies', () => {
    it('should adjust task dates based on dependencies', () => {
      const timeline = new Timeline({ velocityPerWeek: 80 });
      
      const task1 = {
        id: '1',
        startDate: new Date(Date.UTC(2024, 0, 1)),
        endDate: new Date(Date.UTC(2024, 0, 5)),
        dependencies: []
      };
      
      const task2 = {
        id: '2',
        startDate: new Date(Date.UTC(2024, 0, 1)), // Originally same start
        endDate: new Date(Date.UTC(2024, 0, 3)),
        dependencies: [{ type: 'finish-to-start', targetId: '1' }]
      };
      
      const tasks = [task1, task2];
      timeline.adjustForDependencies(tasks);
      
      // Task 2 should start after task 1 ends
      expect(task2.startDate).toEqual(new Date(Date.UTC(2024, 0, 6))); // Day after task1 ends
      expect(task2.endDate).toEqual(new Date(Date.UTC(2024, 0, 8))); // 2 days later
    });

    it('should handle start-to-start dependencies', () => {
      const timeline = new Timeline({ velocityPerWeek: 80 });
      
      const task1 = {
        id: '1',
        startDate: new Date(Date.UTC(2024, 0, 1)),
        endDate: new Date(Date.UTC(2024, 0, 5)),
        dependencies: []
      };
      
      const task2 = {
        id: '2',
        startDate: new Date(Date.UTC(2024, 0, 1)),
        endDate: new Date(Date.UTC(2024, 0, 3)),
        dependencies: [{ type: 'start-to-start', targetId: '1' }]
      };
      
      const tasks = [task1, task2];
      timeline.adjustForDependencies(tasks);
      
      // Task 2 should start when task 1 starts
      expect(task2.startDate).toEqual(new Date(Date.UTC(2024, 0, 1)));
      expect(task2.endDate).toEqual(new Date(Date.UTC(2024, 0, 3)));
    });

    it('should handle multiple dependencies', () => {
      const timeline = new Timeline({ velocityPerWeek: 80 });
      
      const task1 = {
        id: '1',
        startDate: new Date(Date.UTC(2024, 0, 1)),
        endDate: new Date(Date.UTC(2024, 0, 5)),
        dependencies: []
      };
      
      const task2 = {
        id: '2',
        startDate: new Date(Date.UTC(2024, 0, 1)),
        endDate: new Date(Date.UTC(2024, 0, 7)),
        dependencies: []
      };
      
      const task3 = {
        id: '3',
        startDate: new Date(Date.UTC(2024, 0, 1)),
        endDate: new Date(Date.UTC(2024, 0, 3)),
        dependencies: [
          { type: 'finish-to-start', targetId: '1' },
          { type: 'finish-to-start', targetId: '2' }
        ]
      };
      
      const tasks = [task1, task2, task3];
      timeline.adjustForDependencies(tasks);
      
      // Task 3 should start after both task 1 and task 2 end
      // Task 2 ends later (day 7), so task 3 should start day 8
      expect(task3.startDate).toEqual(new Date(Date.UTC(2024, 0, 8)));
    });
  });

  describe('calculateCriticalPath', () => {
    it('should identify critical path in simple chain', () => {
      const timeline = new Timeline({ velocityPerWeek: 80 });
      
      const tasks = [
        {
          id: '1',
          startDate: new Date(Date.UTC(2024, 0, 1)),
          endDate: new Date(Date.UTC(2024, 0, 5)),
          dependencies: []
        },
        {
          id: '2',
          startDate: new Date(Date.UTC(2024, 0, 6)),
          endDate: new Date(Date.UTC(2024, 0, 10)),
          dependencies: [{ type: 'finish-to-start', targetId: '1' }]
        }
      ];
      
      const criticalPath = timeline.calculateCriticalPath(tasks);
      
      expect(criticalPath).toEqual(['1', '2']);
    });

    it('should handle parallel tasks', () => {
      const timeline = new Timeline({ velocityPerWeek: 80 });
      
      const tasks = [
        {
          id: '1',
          startDate: new Date(Date.UTC(2024, 0, 1)),
          endDate: new Date(Date.UTC(2024, 0, 10)), // Longer task
          dependencies: []
        },
        {
          id: '2',
          startDate: new Date(Date.UTC(2024, 0, 1)),
          endDate: new Date(Date.UTC(2024, 0, 5)), // Shorter task
          dependencies: []
        },
        {
          id: '3',
          startDate: new Date(Date.UTC(2024, 0, 11)),
          endDate: new Date(Date.UTC(2024, 0, 15)),
          dependencies: [
            { type: 'finish-to-start', targetId: '1' },
            { type: 'finish-to-start', targetId: '2' }
          ]
        }
      ];
      
      const criticalPath = timeline.calculateCriticalPath(tasks);
      
      // Task 1 is the bottleneck, so critical path should be 1 -> 3
      expect(criticalPath).toEqual(['1', '3']);
    });
  });
});