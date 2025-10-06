import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { Send, ThumbsUp, ThumbsDown, Award, Pin } from 'lucide-react-native';

interface RoomMessage {
  id: string;
  content: string;
  author: string;
  timestamp: Date;
  votes: number;
  isQuestion: boolean;
  bounty?: number;
}

interface RoomChatInterfaceProps {
  roomId: string;
}

const sampleMessages: RoomMessage[] = [
  {
    id: '1',
    content: 'Can someone explain gradient descent optimization in simple terms?',
    author: 'alice_learns',
    timestamp: new Date(),
    votes: 3,
    isQuestion: true,
    bounty: 50,
  },
  {
    id: '2',
    content: 'Gradient descent is like rolling a ball down a hill to find the lowest point. The algorithm adjusts parameters to minimize the error function by following the steepest descent.',
    author: 'ml_expert',
    timestamp: new Date(),
    votes: 8,
    isQuestion: false,
  },
  {
    id: '3',
    content: 'What are the main challenges with local minima in gradient descent?',
    author: 'curious_student',
    timestamp: new Date(),
    votes: 2,
    isQuestion: true,
    bounty: 25,
  },
];

export function RoomChatInterface({ roomId }: RoomChatInterfaceProps) {
  const [messages, setMessages] = useState(sampleMessages);
  const [inputText, setInputText] = useState('');
  const [votedMessages, setVotedMessages] = useState<Set<string>>(new Set());

  const handleVote = (messageId: string, isUpvote: boolean) => {
    if (votedMessages.has(messageId)) return;
    
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, votes: msg.votes + (isUpvote ? 1 : -1) }
        : msg
    ));
    setVotedMessages(prev => new Set([...prev, messageId]));
  };

  const sendMessage = () => {
    if (inputText.trim()) {
      const newMessage: RoomMessage = {
        id: Date.now().toString(),
        content: inputText,
        author: 'you',
        timestamp: new Date(),
        votes: 0,
        isQuestion: inputText.includes('?'),
      };
      setMessages([...messages, newMessage]);
      setInputText('');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.pinnedDocs}>
        <Pin size={14} color="#888888" strokeWidth={1.5} />
        <Text style={styles.pinnedText}>ML Fundamentals.pdf</Text>
        <Text style={styles.pinnedText}>Neural Networks.pdf</Text>
      </View>

      <ScrollView style={styles.messagesContainer} showsVerticalScrollIndicator={false}>
        {messages.map((message) => (
          <View key={message.id} style={styles.messageCard}>
            <View style={styles.messageHeader}>
              <Text style={styles.authorName}>{message.author}</Text>
              {message.bounty && (
                <View style={styles.bountyBadge}>
                  <Award size={12} color="#888888" strokeWidth={1.5} />
                  <Text style={styles.bountyText}>{message.bounty}</Text>
                </View>
              )}
            </View>
            
            <Text style={[
              styles.messageContent,
              message.isQuestion && styles.questionContent
            ]}>
              {message.content}
            </Text>
            
            <View style={styles.messageActions}>
              <TouchableOpacity 
                style={[
                  styles.voteButton,
                  votedMessages.has(message.id) && styles.votedButton
                ]}
                onPress={() => handleVote(message.id, true)}
                disabled={votedMessages.has(message.id)}
              >
                <ThumbsUp size={14} color="#888888" strokeWidth={1.5} />
                <Text style={styles.voteText}>{message.votes}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.voteButton}
                onPress={() => handleVote(message.id, false)}
                disabled={votedMessages.has(message.id)}
              >
                <ThumbsDown size={14} color="#666666" strokeWidth={1.5} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Ask a question or share knowledge..."
          placeholderTextColor="#666666"
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, { opacity: inputText.trim() ? 1 : 0.5 }]}
          onPress={sendMessage}
          disabled={!inputText.trim()}
        >
          <Send size={20} color="#000000" strokeWidth={2} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  pinnedDocs: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#111111',
    borderBottomWidth: 1,
    borderBottomColor: '#222222',
    gap: 8,
  },
  pinnedText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#888888',
    backgroundColor: '#222222',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  messageCard: {
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#222222',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  authorName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    fontWeight: '600',
  },
  bountyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222222',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  bountyText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#888888',
  },
  messageContent: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#CCCCCC',
    lineHeight: 22,
    marginBottom: 12,
  },
  questionContent: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
  },
  messageActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  voteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#222222',
  },
  votedButton: {
    backgroundColor: '#333333',
  },
  voteText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#888888',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#222222',
    gap: 12,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#111111',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#333333',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
});