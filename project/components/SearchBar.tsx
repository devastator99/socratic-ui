import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  Animated, 
  FlatList,
  Modal
} from 'react-native';
import { 
  Search, 
  X, 
  Filter, 
  Clock, 
  TrendingUp,
  User,
  Tag,
  Calendar
} from 'lucide-react-native';

interface SearchSuggestion {
  id: string;
  text: string;
  type: 'recent' | 'trending' | 'user' | 'tag' | 'date';
  metadata?: any;
}

interface SearchFilter {
  id: string;
  label: string;
  type: 'category' | 'date' | 'user' | 'status';
  options: Array<{ value: string; label: string; count?: number }>;
  selected: string[];
}

interface SearchBarProps {
  placeholder?: string;
  onSearch: (query: string, filters: Record<string, string[]>) => void;
  onClear?: () => void;
  suggestions?: SearchSuggestion[];
  filters?: SearchFilter[];
  showSuggestions?: boolean;
  showFilters?: boolean;
  variant?: 'default' | 'compact' | 'expandable';
  autoFocus?: boolean;
  debounceMs?: number;
}

export function SearchBar({
  placeholder = 'Search...',
  onSearch,
  onClear,
  suggestions = [],
  filters = [],
  showSuggestions = true,
  showFilters = true,
  variant = 'default',
  autoFocus = false,
  debounceMs = 300
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(variant !== 'expandable');
  const [showSuggestionsModal, setShowSuggestionsModal] = useState(false);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});
  const [isFocused, setIsFocused] = useState(false);

  const expandAnim = useRef(new Animated.Value(variant === 'expandable' ? 0 : 1)).current;
  const inputRef = useRef<TextInput>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (autoFocus && isExpanded) {
      inputRef.current?.focus();
    }
  }, [autoFocus, isExpanded]);

  useEffect(() => {
    // Initialize filters
    const initialFilters: Record<string, string[]> = {};
    filters.forEach(filter => {
      initialFilters[filter.id] = [];
    });
    setSelectedFilters(initialFilters);
  }, [filters]);

  const handleExpand = () => {
    if (variant === 'expandable') {
      setIsExpanded(true);
      Animated.timing(expandAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }).start(() => {
        inputRef.current?.focus();
      });
    }
  };

  const handleCollapse = () => {
    if (variant === 'expandable' && !query) {
      setIsFocused(false);
      inputRef.current?.blur();
      Animated.timing(expandAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start(() => {
        setIsExpanded(false);
      });
    }
  };

  const handleQueryChange = (text: string) => {
    setQuery(text);
    
    // Debounced search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      onSearch(text, selectedFilters);
    }, debounceMs);
  };

  const handleClear = () => {
    setQuery('');
    onClear?.();
    if (variant === 'expandable') {
      handleCollapse();
    }
  };

  const handleSuggestionPress = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.text);
    setShowSuggestionsModal(false);
    onSearch(suggestion.text, selectedFilters);
  };

  const handleFilterChange = (filterId: string, optionValue: string) => {
    setSelectedFilters(prev => {
      const updated = { ...prev };
      const currentSelected = updated[filterId] || [];
      
      if (currentSelected.includes(optionValue)) {
        updated[filterId] = currentSelected.filter(value => value !== optionValue);
      } else {
        updated[filterId] = [...currentSelected, optionValue];
      }
      
      return updated;
    });
  };

  const getActiveFiltersCount = () => {
    return Object.values(selectedFilters).reduce((count, filterValues) => 
      count + filterValues.length, 0
    );
  };

  const getSuggestionIcon = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'recent':
        return <Clock size={16} color="#6B7280" />;
      case 'trending':
        return <TrendingUp size={16} color="#6B7280" />;
      case 'user':
        return <User size={16} color="#6B7280" />;
      case 'tag':
        return <Tag size={16} color="#6B7280" />;
      case 'date':
        return <Calendar size={16} color="#6B7280" />;
      default:
        return <Search size={16} color="#6B7280" />;
    }
  };

  const renderSuggestions = () => {
    if (!showSuggestions || suggestions.length === 0) return null;

    return (
      <Modal
        visible={showSuggestionsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuggestionsModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          onPress={() => setShowSuggestionsModal(false)}
        >
          <View style={styles.suggestionsModal}>
            <Text style={styles.modalTitle}>Search Suggestions</Text>
            <FlatList
              data={suggestions}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.suggestionItem}
                  onPress={() => handleSuggestionPress(item)}
                >
                  {getSuggestionIcon(item.type)}
                  <Text style={styles.suggestionText}>{item.text}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  const renderFilters = () => {
    if (!showFilters || filters.length === 0) return null;

    return (
      <Modal
        visible={showFiltersModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFiltersModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filtersModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setShowFiltersModal(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={filters}
              keyExtractor={(item) => item.id}
              renderItem={({ item: filter }) => (
                <View style={styles.filterSection}>
                  <Text style={styles.filterLabel}>{filter.label}</Text>
                  <View style={styles.filterOptions}>
                    {filter.options.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.filterOption,
                          selectedFilters[filter.id]?.includes(option.value) && styles.filterOptionSelected
                        ]}
                        onPress={() => handleFilterChange(filter.id, option.value)}
                      >
                        <Text style={[
                          styles.filterOptionText,
                          selectedFilters[filter.id]?.includes(option.value) && styles.filterOptionTextSelected
                        ]}>
                          {option.label}
                          {option.count && ` (${option.count})`}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            />
            
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.clearFiltersButton}
                onPress={() => setSelectedFilters({})}
              >
                <Text style={styles.clearFiltersText}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyFiltersButton}
                onPress={() => {
                  setShowFiltersModal(false);
                  onSearch(query, selectedFilters);
                }}
              >
                <Text style={styles.applyFiltersText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  if (variant === 'compact') {
    return (
      <View style={styles.compactContainer}>
        <TouchableOpacity style={styles.compactSearch} onPress={handleExpand}>
          <Search size={20} color="#6B7280" />
          <Text style={styles.compactPlaceholder}>{placeholder}</Text>
        </TouchableOpacity>
        {showFilters && filters.length > 0 && (
          <TouchableOpacity 
            style={styles.compactFilter}
            onPress={() => setShowFiltersModal(true)}
          >
            <Filter size={20} color="#6B7280" />
            {getActiveFiltersCount() > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{getActiveFiltersCount()}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        {renderSuggestions()}
        {renderFilters()}
      </View>
    );
  }

  return (
    <Animated.View 
      style={[
        styles.container,
        variant === 'expandable' && {
          width: expandAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [48, 300],
          }),
        }
      ]}
    >
      <View style={[
        styles.searchContainer,
        isFocused && styles.searchContainerFocused
      ]}>
        <TouchableOpacity 
          style={styles.searchIcon}
          onPress={variant === 'expandable' && !isExpanded ? handleExpand : undefined}
        >
          <Search size={20} color="#6B7280" />
        </TouchableOpacity>
        
        {isExpanded && (
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            value={query}
            onChangeText={handleQueryChange}
            onFocus={() => {
              setIsFocused(true);
              if (showSuggestions && suggestions.length > 0) {
                setShowSuggestionsModal(true);
              }
            }}
            onBlur={() => {
              setIsFocused(false);
              setTimeout(() => handleCollapse(), 100);
            }}
            returnKeyType="search"
            onSubmitEditing={() => onSearch(query, selectedFilters)}
          />
        )}
        
        {query.length > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
            <X size={18} color="#6B7280" />
          </TouchableOpacity>
        )}
        
        {showFilters && filters.length > 0 && isExpanded && (
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setShowFiltersModal(true)}
          >
            <Filter size={18} color="#6B7280" />
            {getActiveFiltersCount() > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{getActiveFiltersCount()}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>
      
      {renderSuggestions()}
      {renderFilters()}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flex: 1,
    borderWidth: 1,
    borderColor: 'transparent',
  },

  searchContainerFocused: {
    borderColor: '#6366F1',
    backgroundColor: '#FFFFFF',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  searchIcon: {
    marginRight: 8,
  },

  input: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    paddingVertical: 0,
  },

  clearButton: {
    marginLeft: 8,
    padding: 2,
  },

  filterButton: {
    marginLeft: 8,
    position: 'relative',
  },

  filterBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },

  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },

  // Compact variant
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  compactSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flex: 1,
  },

  compactPlaceholder: {
    marginLeft: 8,
    fontSize: 16,
    color: '#9CA3AF',
  },

  compactFilter: {
    padding: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    position: 'relative',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  suggestionsModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    width: '80%',
    maxHeight: '60%',
  },

  filtersModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    width: '90%',
    maxHeight: '80%',
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },

  // Suggestions
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },

  suggestionText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#374151',
  },

  // Filters
  filterSection: {
    marginBottom: 20,
  },

  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },

  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  filterOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  filterOptionSelected: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },

  filterOptionText: {
    fontSize: 14,
    color: '#374151',
  },

  filterOptionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '500',
  },

  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },

  clearFiltersButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },

  clearFiltersText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },

  applyFiltersButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#6366F1',
  },

  applyFiltersText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
});
