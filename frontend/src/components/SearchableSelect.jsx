import { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, RefreshCw } from 'lucide-react';

export const SearchableSelect = ({
  label,
  placeholder = 'Select option...',
  options = [], // static options if passed
  value,
  onChange,
  disabled = false,
  fetchOptions, // async function fetchOptions(searchQuery)
  loading: parentLoading = false,
  error = null
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [localOptions, setLocalOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const debounceTimer = useRef(null);

  // Sync value change to set visual text in input when not focused
  const getSelectedLabel = () => {
    const selected = localOptions.find(o => o.value === value || o === value);
    if (selected) {
      return typeof selected === 'object' ? selected.label : selected;
    }
    return value || '';
  };

  useEffect(() => {
    if (!fetchOptions) {
      // Filter static options case-insensitive
      const q = search.toLowerCase();
      const filtered = options.filter(opt => {
        const labelText = typeof opt === 'object' ? opt.label : opt;
        return labelText.toLowerCase().includes(q);
      });
      setLocalOptions(filtered);
    }
  }, [search, options, fetchOptions]);

  // Load initial options for static list
  useEffect(() => {
    if (!fetchOptions && options.length > 0) {
      setLocalOptions(options);
    }
  }, [options, fetchOptions]);

  // Handle async fetching with debouncing (300ms)
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

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
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
      }
      e.preventDefault();
    } else if (e.key === 'Escape') {
      setIsOpen(false);
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
      <div 
        onClick={() => !disabled && setIsOpen(prev => !prev)}
        className={`flex items-center justify-between input cursor-pointer select-none py-1.5 px-3 text-sm rounded-lg border transition-all ${
          disabled ? 'bg-slate-100 dark:bg-gray-800 text-slate-400 cursor-not-allowed' : 'hover:border-emerald-500 bg-white dark:bg-gray-900 border-slate-200 dark:border-gray-800'
        }`}
      >
        <span className="truncate">{getSelectedLabel() || <span className="text-slate-400">{placeholder}</span>}</span>
        <div className="flex items-center gap-1">
          {isLoading && <RefreshCw className="w-3.5 h-3.5 text-slate-400 animate-spin" />}
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1.5 rounded-xl bg-white dark:bg-[#111814] border border-slate-200 dark:border-gray-800 shadow-xl overflow-hidden max-h-60 flex flex-col">
          {/* Search box inside dropdown */}
          <div className="p-2 border-b border-slate-100 dark:border-gray-800 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              className="w-full bg-transparent border-none outline-none text-sm py-1"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          </div>

          {/* List items */}
          <div className="overflow-y-auto flex-1">
            {localOptions.length === 0 ? (
              <div className="py-3 px-4 text-xs text-center text-slate-400">No Results Found</div>
            ) : (
              localOptions.map((opt, index) => {
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
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
