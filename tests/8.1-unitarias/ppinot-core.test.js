/**
 * 8.1 PRUEBAS UNITARIAS - PPINOT Core
 * 
 * Valida los módulos PPINOT reales: configuración, iconos, tipos, eventos y utilidades.
 * Importa y ejercita el código real del sistema sin fallbacks simulados.
 */

import PPINOT_CONFIG, { getIcon, isSupportedType, getPaletteEntry, publishSynchronization } from '../../app/modules/multinotationModeler/notations/ppinot/config.js';
import svgIcons from '../../app/modules/multinotationModeler/notations/ppinot/svg/index.js';
import { label, directEdit, connections } from '../../app/modules/multinotationModeler/notations/ppinot/Types.js';
import { EVENTS as PPI_EVENTS } from '../../app/modules/ppis/events.js';

describe('8.1 Pruebas Unitarias - PPINOT Core Real', () => {
  describe('PPINOT Configuration - Configuración Principal', () => {
    test('debe cargar PPINOT_CONFIG con estructura completa', () => {
      expect(PPINOT_CONFIG).toBeDefined();
      expect(PPINOT_CONFIG.notation).toBe('PPINOT');
      expect(PPINOT_CONFIG.version).toBe('1.0.0');
      expect(PPINOT_CONFIG.defaultUnit).toBe('milliseconds');
      
      expect(PPINOT_CONFIG.supportedElementTypes).toBeDefined();
      expect(PPINOT_CONFIG.editableElementTypes).toBeDefined();
      expect(PPINOT_CONFIG.connectionTypes).toBeDefined();
      expect(PPINOT_CONFIG.icons).toBeDefined();
      expect(PPINOT_CONFIG.paletteEntries).toBeDefined();
      expect(PPINOT_CONFIG.events).toBeDefined();
    });

    test('debe incluir todos los tipos soportados desde Types.js', () => {
      expect(PPINOT_CONFIG.supportedElementTypes).toEqual(label);
      expect(PPINOT_CONFIG.editableElementTypes).toEqual(directEdit);
      expect(PPINOT_CONFIG.connectionTypes).toEqual(connections);
    });

    test('debe incluir eventos PPINOT con sincronización', () => {
      expect(PPINOT_CONFIG.events).toMatchObject(PPI_EVENTS);
      expect(PPINOT_CONFIG.events.PPINOT_SYNCHRONIZED).toBe('ppinot.synchronized');
    });
  });

  describe('PPINOT Icons - Iconos SVG Reales', () => {
    test('debe cargar todos los iconos desde svg/index.js', () => {
      const iconKeys = Object.keys(PPINOT_CONFIG.icons);
      expect(iconKeys.length).toBeGreaterThan(0);
      
      iconKeys.forEach((key) => {
        expect(PPINOT_CONFIG.icons[key]).toBeDefined();
        expect(typeof PPINOT_CONFIG.icons[key]).toBe('string');
        expect(PPINOT_CONFIG.icons[key]).toMatch(/^data:image/);
      });
    });

    test('debe mapear correctamente iconos desde svgIcons', () => {
      expect(PPINOT_CONFIG.icons.ppi).toBe(svgIcons.dataURLppi);
      expect(PPINOT_CONFIG.icons.scope).toBe(svgIcons.dataURLscope);
      expect(PPINOT_CONFIG.icons.target).toBe(svgIcons.dataURLtarget);
      expect(PPINOT_CONFIG.icons.aggregatedMeasure).toBe(svgIcons.dataURLaggregatedMeasure);
      expect(PPINOT_CONFIG.icons.timeMeasure).toBe(svgIcons.dataURLtimeMeasure);
    });
  });

  describe('PPINOT Palette - Entradas de Paleta', () => {
    test('debe definir entradas de paleta completas', () => {
      expect(PPINOT_CONFIG.paletteEntries).toBeDefined();
      expect(Array.isArray(PPINOT_CONFIG.paletteEntries)).toBe(true);
      expect(PPINOT_CONFIG.paletteEntries.length).toBe(5);
      
      PPINOT_CONFIG.paletteEntries.forEach((entry) => {
        expect(entry.id).toBeDefined();
        expect(entry.type).toBeDefined();
        expect(entry.iconClass).toBeDefined();
        expect(entry.svgIcon).toBeDefined();
        expect(entry.title).toBeDefined();
        expect(entry.svgIcon).toMatch(/^data:image/);
      });
    });
  });

  describe('PPINOT Utilities - Funciones Utilitarias', () => {
    test('getIcon debe retornar iconos correctos', () => {
      expect(getIcon('ppi')).toBe(PPINOT_CONFIG.icons.ppi);
      expect(getIcon('scope')).toBe(PPINOT_CONFIG.icons.scope);
      expect(getIcon('nonexistent')).toBeNull();
    });

    test('isSupportedType debe validar tipos correctamente', () => {
      const supportedType = PPINOT_CONFIG.supportedElementTypes[0];
      expect(isSupportedType(supportedType)).toBe(true);
      expect(isSupportedType('unsupported:Type')).toBe(false);
    });

    test('getPaletteEntry debe encontrar entradas por tipo', () => {
      const ppiEntry = getPaletteEntry('PPINOT:Ppi');
      expect(ppiEntry).toBeDefined();
      expect(ppiEntry.id).toBe('ppinot-ppi');
      expect(ppiEntry.title).toBe('Create PPI');
      
      expect(getPaletteEntry('PPINOT:NonExistent')).toBeNull();
    });

    test('publishSynchronization debe publicar eventos correctamente', () => {
      const mockEventBus = { publish: jest.fn() };
      const payload = { synchronized: true, elements: ['ppi1', 'ppi2'] };
      
      publishSynchronization(mockEventBus, payload);
      
      expect(mockEventBus.publish).toHaveBeenCalledWith('ppinot.synchronized', payload);
    });

    test('publishSynchronization debe fallar con eventBus inválido', () => {
      expect(() => publishSynchronization(null)).toThrow('eventBus.publish debe estar definido');
      expect(() => publishSynchronization({})).toThrow('eventBus.publish debe estar definido');
    });
  });
});