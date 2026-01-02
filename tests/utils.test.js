/**
 * Unit tests for utility functions
 * @module tests/utils.test
 */

import { describe, it, expect, beforeEach } from './test-framework.js';
import {
  formatModifier,
  getProficiencyBonus,
  getSavingThrowModifier,
  getPassivePerception,
  getPassiveInvestigation,
  handleSyncError
} from '../scripts/utils.js';

describe('Utils', () => {
  describe('formatModifier', () => {
    it('should format positive modifiers correctly', () => {
      expect(formatModifier(16)).toBe('+3');
      expect(formatModifier(20)).toBe('+5');
      expect(formatModifier(12)).toBe('+1');
    });

    it('should format negative modifiers correctly', () => {
      expect(formatModifier(8)).toBe('-1');
      expect(formatModifier(6)).toBe('-2');
      expect(formatModifier(3)).toBe('-4');
    });

    it('should format zero modifier correctly', () => {
      expect(formatModifier(10)).toBe('+0');
      expect(formatModifier(11)).toBe('+0');
    });
  });

  describe('getProficiencyBonus', () => {
    it('should calculate proficiency bonus correctly', () => {
      expect(getProficiencyBonus(1)).toBe(2);
      expect(getProficiencyBonus(4)).toBe(2);
      expect(getProficiencyBonus(5)).toBe(3);
      expect(getProficiencyBonus(8)).toBe(3);
      expect(getProficiencyBonus(9)).toBe(4);
      expect(getProficiencyBonus(13)).toBe(5);
      expect(getProficiencyBonus(17)).toBe(6);
      expect(getProficiencyBonus(20)).toBe(6);
    });
  });

  describe('handleSyncError', () => {
    it('should create error info with context', () => {
      const error = new Error('Test error');
      const context = {
        characterName: 'Test Character',
        actionType: 'test-action',
        characterId: 'test-id'
      };

      const errorInfo = handleSyncError(error, context);

      expect(errorInfo.message).toBe('Test error');
      expect(errorInfo.context.characterName).toBe('Test Character');
      expect(errorInfo.context.actionType).toBe('test-action');
      expect(errorInfo.context.characterId).toBe('test-id');
      expect(errorInfo.context.timestamp).toBeDefined();
    });

    it('should handle missing context gracefully', () => {
      const error = new Error('Test error');
      const errorInfo = handleSyncError(error);

      expect(errorInfo.message).toBe('Test error');
      expect(errorInfo.context.characterName).toBe('Unknown');
      expect(errorInfo.context.actionType).toBe('Unknown');
    });
  });
});

