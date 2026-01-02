/**
 * Unit tests for sync functions
 * @module tests/sync.test
 */

import { describe, it, expect, beforeEach, mock } from './test-framework.js';
import { actorToJSON, getCharacterOwner } from '../scripts/sync-core.js';
import { validateActionData } from '../scripts/sync-actions.js';

describe('Sync Core', () => {
  describe('actorToJSON', () => {
    it('should serialize actor data correctly', () => {
      const mockActor = {
        id: 'test-id',
        name: 'Test Character',
        type: 'character',
        img: 'test-img',
        system: {
          details: { level: 5 },
          abilities: { str: { value: 16 } }
        },
        items: [
          {
            id: 'item-1',
            name: 'Sword',
            type: 'weapon',
            img: 'sword-img',
            system: { damage: '1d8' }
          }
        ],
        effects: [
          {
            id: 'effect-1',
            name: 'Bless',
            label: 'Bless',
            icon: 'bless-icon'
          }
        ]
      };

      const result = actorToJSON(mockActor);

      expect(result.id).toBe('test-id');
      expect(result.name).toBe('Test Character');
      expect(result.type).toBe('character');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('Sword');
      expect(result.effects).toHaveLength(1);
      expect(result.effects[0].name).toBe('Bless');
    });

    it('should sanitize string inputs', () => {
      const mockActor = {
        id: 'test-id',
        name: '<script>alert("xss")</script>',
        type: 'character',
        img: '',
        system: {},
        items: [],
        effects: []
      };

      const result = actorToJSON(mockActor);
      
      // Name should be sanitized (no script tags)
      expect(result.name).not.toContain('<script>');
    });
  });

  describe('getCharacterOwner', () => {
    it('should return owner from ownership map', () => {
      const mockUser = { id: 'user-1', name: 'Test User' };
      const mockActor = {
        ownership: new Map([['user-1', 3]]) // OWNER permission
      };

      // Mock game.users.get
      const originalGet = game?.users?.get;
      if (game?.users) {
        game.users.get = jest.fn().mockReturnValue(mockUser);
      }

      const owner = getCharacterOwner(mockActor);

      expect(owner).toBeDefined();
      expect(owner.id).toBe('user-1');
      expect(owner.name).toBe('Test User');

      // Restore
      if (originalGet) {
        game.users.get = originalGet;
      }
    });
  });
});

describe('Sync Actions', () => {
  describe('validateActionData', () => {
    it('should validate correct action data', () => {
      const mockActor = {
        id: 'actor-1',
        isOwner: true,
        items: {
          get: jest.fn().mockReturnValue({ id: 'item-1' })
        }
      };

      // Mock game.actors.get
      const originalGet = game?.actors?.get;
      if (game?.actors) {
        game.actors.get = jest.fn().mockReturnValue(mockActor);
        game.user = { isGM: false };
      }

      const action = {
        characterId: 'actor-1',
        itemId: 'item-1',
        type: 'item-action'
      };

      const validation = validateActionData(action);

      expect(validation.valid).toBe(true);

      // Restore
      if (originalGet) {
        game.actors.get = originalGet;
      }
    });

    it('should reject invalid action data', () => {
      const validation = validateActionData(null);
      expect(validation.valid).toBe(false);
      expect(validation.error).toBeDefined();
    });

    it('should reject action with missing characterId', () => {
      const validation = validateActionData({ type: 'roll' });
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('characterId');
    });
  });
});

