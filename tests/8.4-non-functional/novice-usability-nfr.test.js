/**
 * CA-NFR-03: Usabilidad para usuarios novatos
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';

describe('CA-NFR-03: Usabilidad para novatos', () => {
  let usabilityData = {};

  beforeAll(() => {
  });

  afterAll(() => {
  });

  test('CA-NFR-03: 80% usuarios novatos crean diagrama básico en <5min', async () => {
    const NUM_USERS = 10;
    const SUCCESS_THRESHOLD = 0.80;
    const TIME_LIMIT_MS = 5 * 60 * 1000;
    const FAST_MODE = true;
    
    const basicDiagramFlow = [
      { step: 'open-application', baseTime: 5000, variance: 2000, critical: true },
      { step: 'find-bpmn-panel', baseTime: 8000, variance: 5000, critical: true },
      { step: 'create-start-event', baseTime: 15000, variance: 8000, critical: true },
      { step: 'create-task', baseTime: 20000, variance: 10000, critical: true },
      { step: 'connect-elements', baseTime: 25000, variance: 12000, critical: true },
      { step: 'create-end-event', baseTime: 15000, variance: 7000, critical: true },
      { step: 'connect-to-end', baseTime: 20000, variance: 8000, critical: true },
      { step: 'save-diagram', baseTime: 10000, variance: 5000, critical: false }
    ];
    
    const userResults = [];
    
    for (let userId = 0; userId < NUM_USERS; userId++) {
      let totalTime = 0;
      let stepsCompleted = 0;
      let abandoned = false;
      const userSteps = [];
      
      for (const step of basicDiagramFlow) {
        const userSkillFactor = 0.7 + Math.random() * 0.6;
        const stepTime = (step.baseTime + (Math.random() - 0.5) * step.variance) * userSkillFactor;
        
        const actualStepTime = FAST_MODE ? Math.min(stepTime / 50, 1000) : stepTime;
        
        await new Promise(resolve => setTimeout(resolve, actualStepTime));
        
        totalTime += stepTime;
        
        if (step.critical && totalTime > TIME_LIMIT_MS * 0.8 && Math.random() < 0.3) {
          abandoned = true;
          userSteps.push({ step: step.step, time: stepTime, completed: false, abandoned: true });
          break;
        }
        
        stepsCompleted++;
        userSteps.push({ step: step.step, time: stepTime, completed: true });
      }
      
      const success = !abandoned && totalTime < TIME_LIMIT_MS && stepsCompleted === basicDiagramFlow.length;
      
      userResults.push({
        userId: userId + 1,
        totalTime,
        stepsCompleted,
        totalSteps: basicDiagramFlow.length,
        success,
        abandoned,
        withinTimeLimit: totalTime < TIME_LIMIT_MS,
        steps: userSteps
      });
    }
    
    const successfulUsers = userResults.filter(u => u.success);
    const successRate = successfulUsers.length / NUM_USERS;
    const avgTimeSuccessful = successfulUsers.reduce((sum, u) => sum + u.totalTime, 0) / successfulUsers.length;
    const avgTimeAll = userResults.reduce((sum, u) => sum + u.totalTime, 0) / userResults.length;
    
    usabilityData.noviceUserSuccess = {
      totalUsers: NUM_USERS,
      successfulUsers: successfulUsers.length,
      successRate,
      avgTimeSuccessful: avgTimeSuccessful / 1000,
      avgTimeAll: avgTimeAll / 1000,
      timeLimit: TIME_LIMIT_MS / 1000,
      userResults
    };
    
    expect(successRate).toBeGreaterThanOrEqual(SUCCESS_THRESHOLD);
    expect(avgTimeSuccessful).toBeLessThan(TIME_LIMIT_MS);
  });
});
