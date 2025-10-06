import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Lightbulb } from 'lucide-react-native';

interface SmartSuggestionsProps {
  suggestions: string[];
  onSuggestionPress: (suggestion: string) => void;
}

export function SmartSuggestions({ suggestions, onSuggestionPress }: SmartSuggestionsProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Lightbulb size={16} color="#888888" strokeWidth={1.5} />
        <Text style={styles.headerText}>Suggested Questions</Text>
      </View>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {suggestions.map((suggestion, index) => (
          <TouchableOpacity
            key={index}
            style={styles.suggestionChip}
            onPress={() => onSuggestionPress(suggestion)}
          >
            <Text style={styles.suggestionText} numberOfLines={2}>
              {suggestion}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#222222',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 8,
  },
  headerText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#888888',
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: '#222222',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#333333',
    maxWidth: 200,
  },
  suggestionText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#CCCCCC',
    textAlign: 'center',
  },
});