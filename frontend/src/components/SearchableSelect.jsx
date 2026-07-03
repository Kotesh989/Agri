import { useState, useEffect, useRef } from 'react';
import { ChevronDown, RefreshCw } from 'lucide-react';

export const SearchableSelect = ({
  label,
  placeholder = 'Select or type option...',
  options = [], 
  value,
  onChange,
  disabled = false,
  fetchOptions, 
  loading: parentLoading = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [localOptions, setLocalOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const debounceTimer = useRef(null);

  // Get selected option label matching current value
  const getSelectedLabel = () => {
    const selected = localOptions.find(o => o.value === value || o === value);
    if (selected) {
      return typeof selected === 'object' ? selected.label : selected;
    }
    return value || '';
  };

  useEffect(() => {
    if (!fetchOptions) {
      const q = (search || '').toLowerCase();
      const filtered = (options || []).filter(opt => {
        if (!opt) return false;
        const labelText = typeof opt === 'object' ? (opt.label || '') : String(opt);
        return labelText.toLowerCase().includes(q);
      });
      setLocalOptions(filtered);
    }
  }, [search, options, fetchOptions]);

  useEffect(() => {
    if (!fetchOptions && options.length > 0) {
      setLocalOptions(options);
    }
  }, [options, fetchOptions]);

  const triggerAsyncFetch = (query) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    
    setLoading(true);
    debounceTimer.current = setTimeout(async () => {
      try {
        const res = await fetchOptions(query);
        setLocalOptions(res || []);
      } catch (err) {
        console.error('Dropdown fetch error:', err);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  useEffect(() => {
    if (fetchOptions && isOpen) {
      triggerAsyncFetch(search);
    }
  }, [search, isOpen, fetchOptions]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e) => {
    if (disabled) return;
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      setHighlightedIndex(prev => (prev + 1) % localOptions.length);
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      setHighlightedIndex(prev => (prev - 1 + localOptions.length) % localOptions.length);
      e.preventDefault();
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < localOptions.length) {
        handleSelect(localOptions[highlightedIndex]);
      } else {
        // User typed custom value and hit enter
        onChange(search);
        setIsOpen(false);
      }
      e.preventDefault();
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setSearch('');
      e.preventDefault();
    }
  };

  const handleSelect = (option) => {
    const val = typeof option === 'object' ? option.value : option;
    onChange(val);
    setSearch('');
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const isLoading = loading || parentLoading;

  return (
    <div className="relative w-full text-left" ref={dropdownRef}>
      {label && <label className="block text-xs font-semibold mb-1 text-slate-500 dark:text-gray-400">{label}</label>}
      <div className="relative flex items-center">
        <input
          type="text"
          disabled={disabled}
          placeholder={placeholder}
          value={isOpen ? search : (getSelectedLabel() || '')}
          onFocus={() => !disabled && setIsOpen(true)}
          onChange={(e) => {
            setSearch(e.target.value);
            // Support direct typing of custom names
            onChange(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          className={`w-full input pr-8 text-sm py-1.5 rounded-lg border transition-all ${
            disabled ? 'bg-slate-100 dark:bg-gray-800 text-slate-400 cursor-not-allowed' : 'bg-white dark:bg-gray-900 border-slate-200 dark:border-gray-800 hover:border-emerald-500'
          }`}
        />
        <div 
          onClick={() => !disabled && setIsOpen(prev => !prev)}
          className="absolute right-2 top-2.5 cursor-pointer flex items-center gap-1"
        >
          {isLoading && <RefreshCw className="w-3.5 h-3.5 text-slate-400 animate-spin" />}
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && !disabled && localOptions.length > 0 && (
        <div className="absolute z-50 w-full mt-1.5 rounded-xl bg-white dark:bg-[#111814] border border-slate-200 dark:border-gray-800 shadow-xl overflow-y-auto max-h-48">
          {localOptions.map((opt, index) => {
            const isSelected = (typeof opt === 'object' ? opt.value : opt) === value;
            const isHighlighted = index === highlightedIndex;
            const labelText = typeof opt === 'object' ? opt.label : opt;

            return (
              <div
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(opt);
                }}
                className={`py-2 px-4 text-xs cursor-pointer select-none transition-colors ${
                  isSelected ? 'bg-emerald-500 text-white font-bold' :
                  isHighlighted ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 font-medium' :
                  'hover:bg-slate-50 dark:hover:bg-gray-800/40 text-slate-700 dark:text-gray-300'
                }`}
              >
                {labelText}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
