import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import DBTable from '../handlers/DatabaseHandler';
import { sendnsee } from '../handlers/ChatbotHandler';
import { renderMarkdown } from '../handlers/MarkdownHandler';
import { useTranslation } from 'react-i18next';
import LoadingSpinner from '../components/blocks/LoadingSpinner';

function TrajectoryMap() {
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useAuth();
  const [events, setEvents] = useState([]);
  const [connections, setConnections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newEvent, setNewEvent] = useState({
    type: '',
    name: '',
    year: new Date().getFullYear(),
    description: ''
  });
  const [newConnection, setNewConnection] = useState({
    from: '',
    to: '',
    type: 'influenced',
    description: ''
  });
  const [showCustomTypePopup, setShowCustomTypePopup] = useState(false);
  const [showManageTypesPopup, setShowManageTypesPopup] = useState(false);
  const [showEditEventPopup, setShowEditEventPopup] = useState(false);
  const [showEditConnectionPopup, setShowEditConnectionPopup] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [showConnectionsPopup, setShowConnectionsPopup] = useState(false);
  const [selectedEventConnections, setSelectedEventConnections] = useState([]);
  const [customTypeInput, setCustomTypeInput] = useState('');
  const [currentYear] = useState(new Date().getFullYear());
  const [eventTypes, setEventTypes] = useState(['academic', 'extracurricular', 'personal']);
  const [yearError, setYearError] = useState('');
  const [isYearValid, setIsYearValid] = useState(true);
  const [isEventValid, setIsEventValid] = useState(false);
  const [isConnectionValid, setIsConnectionValid] = useState(false);
  const eventRefs = useRef(new Map());
  const containerRef = useRef(null);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [isInitialRender, setIsInitialRender] = useState(true);
  const [dragState, setDragState] = useState({
    isDragging: false,
    sourceEvent: null,
    currentPosition: { x: 0, y: 0 }
  });
  const [initialEventState, setInitialEventState] = useState(null);
  const [initialConnectionState, setInitialConnectionState] = useState(null);
  const [draggedType, setDraggedType] = useState(null);
  const [dragOverType, setDragOverType] = useState(null);
  const [temporaryConnection, setTemporaryConnection] = useState(null);
  const [showAnalysisPopup, setShowAnalysisPopup] = useState(false);
  const [showPastAnalysesPopup, setShowPastAnalysesPopup] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [pastAnalyses, setPastAnalyses] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);
  const [showConnections, setShowConnections] = useState(true);
  const [openedFromPastAnalyses, setOpenedFromPastAnalyses] = useState(false);
  const [isBottomPanelOpen, setIsBottomPanelOpen] = useState(false);
  const [dragStartY, setDragStartY] = useState(null);
  const [panelHeight, setPanelHeight] = useState(80);
  const [isCreatingChat, setCreatingChat] = useState(false);
  const [data, setData] = useState({
    // ... existing code ...
  });
  const [headerDragState, setHeaderDragState] = useState({
    isDragging: false,
    startX: 0,
    scrollLeft: 0
  });
  const [connectionResolutionPromise, setConnectionResolutionPromise] = useState(null);
  const { t, i18n } = useTranslation();

  // Function to refresh AuthContext data
  const refreshAuthContext = async () => {
    try {
      const authResponse = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (authResponse.ok) {
        const authData = await authResponse.json();
        // console.log('TrajectoryMap - Refreshed AuthContext data:', authData);
        return authData;
      }
    } catch (error) {
      console.error('TrajectoryMap - Error refreshing AuthContext:', error);
    }
    return null;
  };

  // Debug eventTypes changes
  useEffect(() => {
    // console.log('TrajectoryMap - eventTypes state changed to:', eventTypes);
  }, [eventTypes]);

  const handleMouseMove = (e) => {
    if (dragState.isDragging) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const scrollContainer = containerRef.current.querySelector('.flex-1.overflow-auto');
      setDragState(prev => ({
        ...prev,
        currentPosition: {
          x: e.clientX - containerRect.left + (scrollContainer?.scrollLeft || 0),
          y: e.clientY - containerRect.top + (scrollContainer?.scrollTop || 0) - 45
        }
      }));
    }
  };

  const handleMouseUp = (e) => {
    if (dragState.isDragging) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - containerRect.left;
      const mouseY = e.clientY - containerRect.top;

      // Find the event card under the mouse
      const targetEvent = Array.from(eventRefs.current.values()).find(eventEl => {
        const rect = eventEl.getBoundingClientRect();
        const relativeX = rect.left - containerRect.left;
        const relativeY = rect.top - containerRect.top;
        return (
          mouseX >= relativeX &&
          mouseX <= relativeX + rect.width &&
          mouseY >= relativeY &&
          mouseY <= relativeY + rect.height
        );
      });

      if (targetEvent) {
        // Find the event data for the target element
        const targetEventData = events.find(event =>
          eventRefs.current.get(event.id) === targetEvent
        );

        if (targetEventData && targetEventData.id !== dragState.sourceEvent.id) {
          // Create a new temporary connection
          const newConnection = {
            id: `connection_${Date.now()}`,
            from: dragState.sourceEvent.id,
            to: targetEventData.id,
            type: 'influenced',
            description: ''
          };

          // Add the connection to the list temporarily
          setConnections(prev => [...prev, newConnection]);
          setTemporaryConnection(newConnection);

          // Set the connection for editing
          setSelectedConnection(newConnection);
          setShowEditConnectionPopup(true);
        }
      }

      setDragState({
        isDragging: false,
        sourceEvent: null,
        currentPosition: { x: 0, y: 0 }
      });
    }
  };

  const handleTouchStart = (e) => {
    // Only prevent default if we're actually starting to drag
    if (dragStartY === null) {
      e.preventDefault();
    }
    setDragStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e) => {
    if (dragStartY === null) return;

    // Only prevent default if we're actually dragging
    e.preventDefault();
    const deltaY = dragStartY - e.touches[0].clientY;
    const newHeight = Math.max(80, Math.min(window.innerHeight * 0.8, panelHeight + deltaY));
    setPanelHeight(newHeight);
    setDragStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    setDragStartY(null);
    // Snap to open or closed state
    if (panelHeight > window.innerHeight * 0.4) {
      setPanelHeight(window.innerHeight * 0.8);
      setIsBottomPanelOpen(true);
    } else {
      setPanelHeight(80);
      setIsBottomPanelOpen(false);
    }
  };

  const handleDragStart = (e) => {
    e.preventDefault();
    const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
    setDragStartY(clientY);
    setIsBottomPanelOpen(true);
  };

  const handleDragMove = (e) => {
    e.preventDefault();
    if (dragStartY === null) return;

    const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
    const deltaY = dragStartY - clientY;
    const newHeight = Math.max(80, Math.min(window.innerHeight * 0.8, panelHeight + deltaY));
    setPanelHeight(newHeight);
    setDragStartY(clientY);
  };

  const handleDragEnd = () => {
    setDragStartY(null);
    // Snap to open or closed state
    if (panelHeight > window.innerHeight * 0.4) {
      setPanelHeight(window.innerHeight * 0.8);
      setIsBottomPanelOpen(true);
    } else {
      setPanelHeight(40); // Reduced from 60 to 40
      setIsBottomPanelOpen(false);
    }
  };

  const handleHeaderMouseDown = (e) => {
    e.preventDefault(); // Prevent default behavior
    const scrollContainer = containerRef.current.querySelector('.flex-1.overflow-auto');
    if (!scrollContainer) return;

    setHeaderDragState({
      isDragging: true,
      startX: e.pageX - scrollContainer.offsetLeft,
      scrollLeft: scrollContainer.scrollLeft
    });
  };

  const handleHeaderMouseMove = (e) => {
    if (!headerDragState.isDragging) return;
    e.preventDefault(); // Prevent default behavior

    const scrollContainer = containerRef.current.querySelector('.flex-1.overflow-auto');
    if (!scrollContainer) return;

    const x = e.pageX - scrollContainer.offsetLeft;
    const walk = (x - headerDragState.startX) * 2; // Multiply by 2 for faster scrolling
    scrollContainer.scrollLeft = headerDragState.scrollLeft - walk;
  };

  const handleHeaderMouseUp = (e) => {
    e.preventDefault(); // Prevent default behavior
    setHeaderDragState({
      isDragging: false,
      startX: 0,
      scrollLeft: 0
    });
  };

  // Add effect to handle initial connection rendering
  useEffect(() => {
    if (isInitialRender && events.length > 0 && connections.length > 0) {
      // Small delay to ensure DOM elements are mounted
      const timer = setTimeout(() => {
        setForceUpdate(prev => prev + 1);
        setIsInitialRender(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [events, connections, isInitialRender]);

  // Add window resize handler
  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(window.innerWidth);
      // Hide connections if screen is too narrow
      setShowConnections(window.innerWidth >= 1024);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('mouseup', handleDragEnd);
    window.addEventListener('mousemove', handleHeaderMouseMove);
    window.addEventListener('mouseup', handleHeaderMouseUp);

    // Add touch event listeners with passive: false
    const dragHandle = document.querySelector('.drag-handle');
    if (dragHandle) {
      dragHandle.addEventListener('touchstart', handleTouchStart, { passive: false });
      dragHandle.addEventListener('touchmove', handleTouchMove, { passive: false });
      dragHandle.addEventListener('touchend', handleTouchEnd, { passive: false });
    }

    // Initial check
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('mousemove', handleHeaderMouseMove);
      window.removeEventListener('mouseup', handleHeaderMouseUp);

      // Remove touch event listeners
      if (dragHandle) {
        dragHandle.removeEventListener('touchstart', handleTouchStart);
        dragHandle.removeEventListener('touchmove', handleTouchMove);
        dragHandle.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }, [dragState.isDragging, events, dragStartY, headerDragState.isDragging]);

  useEffect(() => {
    // console.log('TrajectoryMap - useEffect triggered with currentUser:', currentUser);
    if (currentUser) {
      // console.log('TrajectoryMap - currentUser has User_ID:', currentUser.User_ID);
      // console.log('TrajectoryMap - currentUser event_types:', currentUser.event_types);
      loadTrajectoryData();
    }
  }, [currentUser]);

  const userTable = new DBTable(
    "USER",
    "User_ID",
    {
      User_ID: "",
      First_Name: "",
      Last_Name: "",
      Nickname: "",
      Title: "",
      Gender: "",
      Email_Address: "",
      Tel: "",
      User_Role: "",
      direct_marketing: false,
      email_list: false,
      card_id: "",
      ability_6d: [1.5, 1.5, 1.5, 1.5, 1.5, 1.5],
      trajectory_events: [],
      trajectory_connections: [],
      trajectory_analyses: [],
      event_types: ['academic', 'extracurricular', 'personal']
    }
  );

  // Validate event form
  useEffect(() => {
    const year = parseInt(newEvent.year);
    const isValid =
      newEvent.name.trim() !== '' &&
      newEvent.type !== '' &&
      newEvent.year !== '' &&
      !isNaN(year) &&
      validateYear(year) === '';
    setIsEventValid(isValid);
  }, [newEvent]);

  // Validate connection form
  useEffect(() => {
    const isValid =
      newConnection.from !== '' &&
      newConnection.to !== '' &&
      newConnection.type !== '' &&
      newConnection.from !== newConnection.to; // Prevent reflexive relations
    setIsConnectionValid(isValid);
  }, [newConnection]);

  const loadTrajectoryData = async () => {
    try {
      // console.log('TrajectoryMap - loadTrajectoryData called with currentUser:', currentUser);
      if (!currentUser || !currentUser.User_ID) {
        console.error("No user data found");
        navigate('/login');
        return;
      }

      // console.log('TrajectoryMap - Fetching complete user data for:', currentUser.User_ID);

      // Fetch complete user data from database
      const userData = await userTable.handleRead({ User_ID: currentUser.User_ID }, false);

      if (userData) {
        // console.log('TrajectoryMap - Complete user data:', userData);
        // console.log('TrajectoryMap - Setting events:', userData.trajectory_events);
        // console.log('TrajectoryMap - Setting connections:', userData.trajectory_connections);
        // console.log('TrajectoryMap - Setting past analyses:', userData.trajectory_analyses);

        setEvents(userData.trajectory_events || []);
        setConnections(userData.trajectory_connections || []);
        setPastAnalyses(userData.trajectory_analyses || []);

        // Set event types from user data, preserving the order
        if (userData.event_types && userData.event_types.length > 0) {
          // console.log('TrajectoryMap - Setting event types from user data:', userData.event_types);
          // console.log('TrajectoryMap - Current AuthContext event_types:', currentUser.event_types);

          // Check if AuthContext and database have different event types
          if (currentUser.event_types && JSON.stringify(currentUser.event_types) !== JSON.stringify(userData.event_types)) {
            // console.log('TrajectoryMap - WARNING: AuthContext and database have different event types!');
            // console.log('TrajectoryMap - AuthContext:', currentUser.event_types);
            // console.log('TrajectoryMap - Database:', userData.event_types);
          }

          setEventTypes(userData.event_types);
        } else {
          // Only use default if no event types exist
          // console.log('TrajectoryMap - No event types in user data, using defaults');
          setEventTypes(['academic', 'extracurricular', 'personal']);
        }

        setIsInitialRender(true);
      } else {
        console.error("TrajectoryMap - Failed to fetch user data");
      }
    } catch (error) {
      console.error("Error loading trajectory data:", error);
      if (error.message.includes('401')) {
        navigate('/login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const validateYear = (year) => {
    const currentYear = new Date().getFullYear();
    const minYear = 1900; // Reasonable minimum year
    const maxYear = currentYear + 10; // Allow up to 10 years in the future

    if (!Number.isInteger(year)) {
      return 'Year must be a whole number';
    }
    if (year < minYear) {
      return `Year must be after ${minYear}`;
    }
    if (year > maxYear) {
      return `Year cannot be more than 10 years in the future`;
    }
    return '';
  };

  const handleYearChange = (e) => {
    const value = e.target.value;
    const year = parseInt(value);

    if (value === '') {
      setNewEvent(prev => ({ ...prev, year: '' }));
      setYearError('');
      setIsYearValid(false);
      return;
    }

    if (!isNaN(year)) {
      const error = validateYear(year);
      setYearError(error);
      setIsYearValid(!error);
      setNewEvent(prev => ({ ...prev, year }));
    } else {
      setNewEvent(prev => ({ ...prev, year: value }));
      setIsYearValid(false);
    }
  };

  const handleAddEvent = async () => {
    if (!newEvent.name.trim()) return;

    const year = parseInt(newEvent.year);
    const error = validateYear(year);
    if (error) {
      setYearError(error);
      setIsYearValid(false);
      return;
    }

    try {
      if (!currentUser || !currentUser.User_ID) {
        throw new Error("No user data found");
      }

      const newEventObj = {
        id: `event_${Date.now()}`,
        name: newEvent.name.trim(),
        year: parseInt(newEvent.year),
        type: newEvent.type,
        description: newEvent.description?.trim() || '',
        timestamp: new Date().toISOString()
      };

      const updatedEvents = [...events, newEventObj];

      const response = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          trajectory_events: updatedEvents
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add event');
      }

      setEvents(updatedEvents);
      setNewEvent({ type: '', name: '', year: new Date().getFullYear(), description: '' });
      setYearError('');
      setIsYearValid(true);
    } catch (error) {
      console.error("Error adding event:", error);
      alert('Failed to add event. Please try again.');
    }
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setInitialEventState({ ...event });
    setShowEditEventPopup(true);
  };

  const handleConnectionClick = (connection) => {
    setSelectedConnection(connection);
    setInitialConnectionState({ ...connection });
    setShowEditConnectionPopup(true);
  };

  const handleAddConnection = async () => {
    if (!newConnection.from || !newConnection.to) return;

    // Prevent reflexive relations
    if (newConnection.from === newConnection.to) {
      alert('Cannot create a connection from an event to itself');
      return;
    }

    try {
      if (!currentUser || !currentUser.User_ID) {
        throw new Error("No user data found");
      }

      const newConnectionObj = {
        id: `connection_${Date.now()}`,
        from: newConnection.from,
        to: newConnection.to,
        type: newConnection.type,
        description: newConnection.description.trim()
      };

      const response = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          trajectory_connections: [...connections, newConnectionObj]
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add connection');
      }

      setConnections([...connections, newConnectionObj]);
      setNewConnection({
        from: '',
        to: '',
        type: 'influenced',
        description: ''
      });
    } catch (error) {
      console.error('Error adding connection:', error);
      alert('Failed to add connection. Please try again.');
    }
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const updatedEvents = events.filter(event => event.id !== eventId);

      // Also remove any connections involving this event
      const updatedConnections = connections.filter(
        conn => conn.from !== eventId && conn.to !== eventId
      );

      const response = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          trajectory_events: updatedEvents,
          trajectory_connections: updatedConnections
        })
      });

      if (!response.ok) {
        throw new Error('Failed to delete event');
      }

      setEvents(updatedEvents);
      setConnections(updatedConnections);
      setShowEditEventPopup(false);
      setSelectedEvent(null);
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const handleDeleteConnection = async (connectionId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const updatedConnections = connections.filter(conn => conn.id !== connectionId);

      const response = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          trajectory_connections: updatedConnections
        })
      });

      if (!response.ok) {
        throw new Error('Failed to delete connection');
      }

      setConnections(updatedConnections);

      // If this was triggered by invalid connections during analysis, resolve the promise
      if (selectedConnection?.hasMissingEvents && connectionResolutionPromise) {
        connectionResolutionPromise();
        setConnectionResolutionPromise(null);
      }

      setShowEditConnectionPopup(false);
      setSelectedConnection(null);
    } catch (error) {
      console.error('Error deleting connection:', error);
    }
  };

  const handleUpdateEvent = async () => {
    try {
      if (!currentUser || !currentUser.User_ID) {
        throw new Error("No user data found");
      }

      const updatedEvents = events.map(event =>
        event.id === selectedEvent.id ? selectedEvent : event
      );
      setEvents(updatedEvents);

      const response = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          trajectory_events: updatedEvents
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update event');
      }

      setShowEditEventPopup(false);
    } catch (error) {
      console.error("Error updating event:", error);
    }
  };

  const handleUpdateConnection = async () => {
    try {
      if (!currentUser || !currentUser.User_ID) {
        throw new Error("No user data found");
      }

      // Prevent reflexive relations
      if (selectedConnection.from === selectedConnection.to) {
        alert('Cannot create a connection from an event to itself');
        return;
      }

      const updatedConnections = connections.map(connection =>
        connection.id === selectedConnection.id ? selectedConnection : connection
      );

      const response = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          trajectory_connections: updatedConnections
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update connection');
      }

      setConnections(updatedConnections);

      // If this was triggered by invalid connections during analysis, resolve the promise
      if (selectedConnection?.hasMissingEvents && connectionResolutionPromise) {
        connectionResolutionPromise();
        setConnectionResolutionPromise(null);
      }

      setShowEditConnectionPopup(false);
      setSelectedConnection(null);
      setInitialConnectionState(null);
    } catch (error) {
      console.error('Error updating connection:', error);
      alert('Failed to update connection. Please try again.');
    }
  };

  const getConnectionColor = (type) => {
    switch (type) {
      case 'influenced':
        return '#3B82F6'; // blue-500
      case 'led_to':
        return '#10B981'; // emerald-500
      case 'related':
        return '#8B5CF6'; // violet-500
      default:
        return '#6B7280'; // gray-500
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'academic':
        return 'bg-blue-100 text-blue-800';
      case 'extracurricular':
        return 'bg-green-100 text-green-800';
      case 'personal':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeBorderColor = (type) => {
    switch (type) {
      case 'academic':
        return 'border-blue-200';
      case 'extracurricular':
        return 'border-green-200';
      case 'personal':
        return 'border-purple-200';
      default:
        return 'border-gray-200';
    }
  };

  const getEventPosition = (event, isStart = true, targetEvent = null) => {
    const eventElement = eventRefs.current.get(event.id);
    const containerElement = containerRef.current;

    if (!eventElement || !containerElement) {
      return { x: 0, y: 0 };
    }

    const eventRect = eventElement.getBoundingClientRect();
    const containerRect = containerElement.getBoundingClientRect();

    // Calculate relative positions within the container
    const relativeX = eventRect.left - containerRect.left;
    const relativeY = eventRect.top - containerRect.top;

    // Determine if the arrow should point downward
    let isDownward = false;
    if (targetEvent) {
      const targetElement = eventRefs.current.get(targetEvent.id);
      if (targetElement) {
        const targetRect = targetElement.getBoundingClientRect();
        isDownward = targetRect.top !== eventRect.top;
      }
    }

    let x, y;
    if (isDownward) {
      // For downward arrows, use horizontal center and vertical edges
      x = relativeX + eventRect.width / 2;
      if (isStart) {
        // Start from bottom center of source event
        y = relativeY + eventRect.height;
      } else {
        // End at top center of target event
        y = relativeY;
      }
    } else {
      // For horizontal arrows, use vertical center and horizontal edges
      x = isStart ? relativeX + eventRect.width : relativeX;
      y = relativeY + eventRect.height / 2;
    }

    // Adjust y-coordinate to account for container's scroll position and move arrows up
    y = y - containerElement.scrollTop - 45; // Set to 45 pixels for optimal positioning

    return { x, y };
  };

  const renderConnections = () => {
    return connections.map((connection) => {
      const fromEvent = events.find(e => e.id === connection.from);
      const toEvent = events.find(e => e.id === connection.to);

      if (!fromEvent || !toEvent) return null;

      // Get the event elements and their positions
      const fromElement = eventRefs.current.get(fromEvent.id);
      const toElement = eventRefs.current.get(toEvent.id);
      const containerElement = containerRef.current;

      if (!fromElement || !toElement || !containerElement) return null;

      const fromRect = fromElement.getBoundingClientRect();
      const toRect = toElement.getBoundingClientRect();
      const containerRect = containerElement.getBoundingClientRect();
      const scrollContainer = containerElement.querySelector('.flex-1.overflow-auto');

      // Calculate relative positions within the container, accounting for scroll
      const fromX = fromRect.left - containerRect.left + (scrollContainer?.scrollLeft || 0);
      const fromY = fromRect.top - containerRect.top + (scrollContainer?.scrollTop || 0);
      const toX = toRect.left - containerRect.left + (scrollContainer?.scrollLeft || 0);
      const toY = toRect.top - containerRect.top + (scrollContainer?.scrollTop || 0);

      // Calculate the direction vector
      const dx = toX - fromX;
      const dy = toY - fromY;

      // Determine start and end points based on direction
      let startX, startY, endX, endY;

      if (Math.abs(dx) > Math.abs(dy)) {
        // Horizontal connection
        startX = dx > 0 ? fromX + fromRect.width : fromX;
        startY = fromY + fromRect.height / 2;
        endX = dx > 0 ? toX : toX + toRect.width;
        endY = toY + toRect.height / 2;
      } else {
        // Vertical connection
        startX = fromX + fromRect.width / 2;
        startY = dy > 0 ? fromY + fromRect.height : fromY;
        endX = toX + toRect.width / 2;
        endY = dy > 0 ? toY : toY + toRect.height;
      }

      // Adjust for container scroll and arrow offset
      startY = startY - containerElement.scrollTop - 45;
      endY = endY - containerElement.scrollTop - 45;

      // Calculate the angle for the arrow head
      const angle = Math.atan2(endY - startY, endX - startX) * 180 / Math.PI;

      // Calculate control points for the curved arrow
      const midX = (startX + endX) / 2;
      const horizontalDistance = endX - startX;

      // Adjust curve height based on horizontal distance
      const minCurveHeight = 30;
      const maxCurveHeight = 100;
      const curveHeight = Math.min(
        maxCurveHeight,
        Math.max(minCurveHeight, Math.abs(horizontalDistance) * 0.3)
      );

      const controlY = Math.min(startY, endY) - curveHeight;

      // Calculate the middle point of the curve
      const t = 0.5; // Parameter for the quadratic Bezier curve
      const midPoint = {
        x: Math.pow(1 - t, 2) * startX + 2 * (1 - t) * t * midX + Math.pow(t, 2) * endX,
        y: Math.pow(1 - t, 2) * startY + 2 * (1 - t) * t * controlY + Math.pow(t, 2) * endY
      };

      const connectionColor = getConnectionColor(connection.type);
      const symbol = connection.type.charAt(0).toUpperCase();

      return (
        <svg
          key={connection.id}
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
          style={{
            zIndex: 4,  // Lower than popup's z-index of 50
            position: 'absolute',  // Keep scrolling with container
            pointerEvents: 'none'
          }}
        >
          <defs>
            <marker
              id="arrowhead-influenced"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill="#3B82F6"
              />
            </marker>
            <marker
              id="arrowhead-led_to"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill="#10B981"
              />
            </marker>
            <marker
              id="arrowhead-related"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill="#8B5CF6"
              />
            </marker>
            <marker
              id="arrowhead-default"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill="#6B7280"
              />
            </marker>
          </defs>
          <path
            d={`M ${startX} ${startY} Q ${midX} ${controlY}, ${endX} ${endY}`}
            stroke={connectionColor}
            strokeWidth="2"
            fill="none"
            markerEnd={`url(#arrowhead-${connection.type || 'default'})`}
          />
          {/* Clickable circle with symbol */}
          <g
            onClick={(e) => {
              e.stopPropagation();
              setSelectedConnection(connection);
              setShowEditConnectionPopup(true);
            }}
            className="pointer-events-auto cursor-pointer"
          >
            <circle
              cx={midPoint.x}
              cy={midPoint.y}
              r="12"
              fill="white"
              stroke={connectionColor}
              strokeWidth="2"
            />
            <text
              x={midPoint.x}
              y={midPoint.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={connectionColor}
              className="font-semibold"
            >
              {symbol}
            </text>
          </g>
        </svg>
      );
    });
  };

  const handleCustomTypeSubmit = async () => {
    if (customTypeInput.trim()) {
      const newType = customTypeInput.trim().toLowerCase();
      if (!eventTypes.includes(newType)) {
        const newTypes = [...eventTypes, newType];

        try {
          const response = await fetch('/api/auth/me', {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              event_types: newTypes
            })
          });

          if (!response.ok) {
            throw new Error('Failed to update event types');
          }

          setEventTypes(newTypes);
          setNewEvent(prev => ({ ...prev, type: newType }));
          setCustomTypeInput('');
          setShowCustomTypePopup(false);

          // Refresh AuthContext data to ensure synchronization
          await refreshAuthContext();

          // Reopen bottom panel after adding new type
          setIsBottomPanelOpen(true);
        } catch (error) {
          console.error('Error updating event types:', error);
          alert('Failed to add new event type. Please try again.');
        }
      }
    }
  };

  const handleDeleteType = async (typeToDelete) => {
    // Don't allow deletion if there are events using this type
    const eventsUsingType = events.filter(event => event.type === typeToDelete);
    if (eventsUsingType.length > 0) {
      alert(`Cannot delete this type as it is being used by ${eventsUsingType.length} event(s).`);
      return;
    }

    const newTypes = eventTypes.filter(type => type !== typeToDelete);

    try {
      const response = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          event_types: newTypes
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update event types');
      }

      setEventTypes(newTypes);
      if (newEvent.type === typeToDelete) {
        setNewEvent({ ...newEvent, type: '' });
      }

      // Refresh AuthContext data to ensure synchronization
      await refreshAuthContext();
    } catch (error) {
      console.error('Error updating event types:', error);
      alert('Failed to update event types. Please try again.');
    }
  };

  // Calculate the earliest year for the timeline
  const getEarliestYear = () => {
    if (events.length === 0) {
      return currentYear - 5;
    }
    const earliestEventYear = Math.min(...events.map(event => event.year));
    return Math.min(earliestEventYear, currentYear - 5);
  };

  // Generate years array for the timeline
  const getYears = () => {
    const earliestYear = getEarliestYear();
    const years = [];
    for (let year = earliestYear; year <= currentYear + 5; year++) {
      years.push(year);
    }
    return years;
  };

  const sortEventsTopologically = (events, connections) => {
    // Create a map of event dependencies
    const dependencies = new Map();
    const eventMap = new Map(events.map(event => [event.id, event]));

    // Initialize dependencies
    events.forEach(event => {
      dependencies.set(event.id, new Set());
    });

    // Add dependencies based on connections
    connections.forEach(connection => {
      // Only add dependency if both events exist in the current group
      if (eventMap.has(connection.from) && eventMap.has(connection.to)) {
        dependencies.get(connection.to).add(connection.from);
      }
    });

    // Perform topological sort
    const sortedEvents = [];
    const visited = new Set();
    const temp = new Set();

    const visit = (eventId) => {
      if (temp.has(eventId)) {
        // Cycle detected, but we'll handle it gracefully
        return;
      }
      if (visited.has(eventId)) {
        return;
      }

      temp.add(eventId);
      dependencies.get(eventId).forEach(depId => {
        visit(depId);
      });
      temp.delete(eventId);
      visited.add(eventId);
      sortedEvents.push(eventMap.get(eventId));
    };

    // Visit all events
    events.forEach(event => {
      if (!visited.has(event.id)) {
        visit(event.id);
      }
    });

    return sortedEvents;
  };

  const getEventConnections = (eventId) => {
    return connections.filter(conn => conn.from === eventId || conn.to === eventId);
  };

  const handleConnectionsClick = (event) => {
    const eventConnections = getEventConnections(event.id);
    setSelectedEvent(event);
    setSelectedEventConnections(eventConnections);
    setShowConnectionsPopup(true);
  };

  const handleTypeDragStart = (e, type) => {
    setDraggedType(type);
    e.dataTransfer.effectAllowed = 'move';
    // Add a class to the dragged element
    e.target.classList.add('dragging');
  };

  const handleTypeDragOver = (e, type) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (type !== draggedType) {
      setDragOverType(type);
    }
  };

  const handleTypeDragLeave = (e, type) => {
    // Only reset if we're leaving the current dragOverType
    if (type === dragOverType) {
      setDragOverType(null);
    }
  };

  const handleTypeDrop = async (e, targetType) => {
    e.preventDefault();
    if (!draggedType || draggedType === targetType) return;

    const draggedIndex = eventTypes.indexOf(draggedType);
    const targetIndex = eventTypes.indexOf(targetType);

    // console.log('TrajectoryMap - handleTypeDrop - draggedType:', draggedType, 'targetType:', targetType);
    // console.log('TrajectoryMap - handleTypeDrop - draggedIndex:', draggedIndex, 'targetIndex:', targetIndex);

    const newTypes = [...eventTypes];
    newTypes.splice(draggedIndex, 1);
    newTypes.splice(targetIndex, 0, draggedType);

    // console.log('TrajectoryMap - handleTypeDrop - newTypes:', newTypes);

    try {
      const response = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          event_types: newTypes
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update event types');
      }

      // console.log('TrajectoryMap - handleTypeDrop - Successfully updated event types in database');
      setEventTypes(newTypes);

      // Refresh AuthContext data to ensure synchronization
      await refreshAuthContext();

      setDraggedType(null);
      setDragOverType(null);
      // Remove the dragging class
      e.target.classList.remove('dragging');
      // Force update to ensure arrows are rerendered
      setForceUpdate(prev => prev + 1);
    } catch (error) {
      console.error('Error updating event types:', error);
      alert('Failed to update event types. Please try again.');
    }
  };

  const handleConnectionDragStart = (event) => {
    const eventElement = eventRefs.current.get(event.id);
    if (!eventElement) return;

    const rect = eventElement.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();

    // Calculate relative positions within the container
    const relativeX = rect.left - containerRect.left;
    const relativeY = rect.top - containerRect.top;

    // Use the same logic as getEventPosition for starting position
    const startX = relativeX + rect.width;
    const startY = relativeY + rect.height / 2;

    // Adjust for container scroll and arrow offset
    const adjustedY = startY - containerRef.current.scrollTop - 45;

    setDragState({
      isDragging: true,
      sourceEvent: event,
      currentPosition: {
        x: startX,
        y: adjustedY
      }
    });
  };

  const renderDragLine = () => {
    if (!dragState.isDragging) return null;

    const sourceEvent = dragState.sourceEvent;
    const sourcePos = getEventPosition(sourceEvent, true);
    const currentPos = dragState.currentPosition;

    // Calculate the angle for the arrow head
    const dx = currentPos.x - sourcePos.x;
    const dy = currentPos.y - sourcePos.y;
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;

    // Get the source event's dimensions
    const sourceElement = eventRefs.current.get(sourceEvent.id);
    const sourceRect = sourceElement.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    const scrollContainer = containerRef.current.querySelector('.flex-1.overflow-auto');

    // Calculate relative positions within the container
    const relativeSourceX = sourceRect.left - containerRect.left + (scrollContainer?.scrollLeft || 0);
    const relativeSourceY = sourceRect.top - containerRect.top + (scrollContainer?.scrollTop || 0);

    // Determine which edge to start from based on drag direction
    let startX, startY;
    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal drag
      startX = dx > 0 ? relativeSourceX + sourceRect.width : relativeSourceX;
      startY = relativeSourceY + sourceRect.height / 2;
    } else {
      // Vertical drag
      startX = relativeSourceX + sourceRect.width / 2;
      startY = dy > 0 ? relativeSourceY + sourceRect.height : relativeSourceY;
    }

    // Adjust for arrow offset
    startY = startY - 45;

    return (
      <svg
        className="absolute top-0 left-0 w-full h-full pointer-events-none"
        style={{ zIndex: 4 }}
      >
        <path
          d={`M ${startX} ${startY} L ${currentPos.x} ${currentPos.y}`}
          stroke={getConnectionColor('influenced')}
          strokeWidth="2"
          fill="none"
        />
        <circle
          cx={currentPos.x}
          cy={currentPos.y}
          r="5"
          fill={getConnectionColor('influenced')}
        />
      </svg>
    );
  };

  const hasEventChanged = () => {
    if (!selectedEvent || !initialEventState) return false;
    return (
      selectedEvent.name !== initialEventState.name ||
      selectedEvent.year !== initialEventState.year ||
      selectedEvent.type !== initialEventState.type ||
      selectedEvent.description !== initialEventState.description
    );
  };

  const hasConnectionChanged = () => {
    if (!selectedConnection || !initialConnectionState) return false;
    return (
      selectedConnection.from !== initialConnectionState.from ||
      selectedConnection.to !== initialConnectionState.to ||
      selectedConnection.type !== initialConnectionState.type ||
      selectedConnection.description !== initialConnectionState.description
    );
  };

  const handleCloseEditConnectionPopup = () => {
    if (temporaryConnection) {
      // Remove the temporary connection if it exists
      setConnections(prev => prev.filter(conn => conn.id !== temporaryConnection.id));
      setTemporaryConnection(null);
    }

    // If this was triggered by invalid connections during analysis, resolve the promise
    if (selectedConnection?.hasMissingEvents && connectionResolutionPromise) {
      connectionResolutionPromise();
      setConnectionResolutionPromise(null);
    }

    setShowEditConnectionPopup(false);
    setSelectedConnection(null);
    setInitialConnectionState(null);
  };

  const formatDataForAnalysis = () => {
    return new Promise((resolve, reject) => {
      // Sort events by year
      const sortedEvents = [...events].sort((a, b) => a.year - b.year);

      // Format events
      const formattedEvents = sortedEvents.map(event => ({
        name: event.name,
        year: event.year,
        type: event.type,
        description: event.description
      }));

      // Format connections
      const formattedConnections = connections.map(conn => {
        const fromEvent = events.find(e => e.id === conn.from);
        const toEvent = events.find(e => e.id === conn.to);

        // Check if either event is not found
        if (!fromEvent || !toEvent) {
          // Create a new promise for connection resolution
          const resolutionPromise = new Promise((resolveConnection) => {
            setConnectionResolutionPromise(() => resolveConnection);
          });

          // Set the connection for editing with a flag indicating missing events
          setSelectedConnection({
            ...conn,
            hasMissingEvents: true
          });
          setShowEditConnectionPopup(true);

          // Reject with the resolution promise
          reject({ type: 'Invalid connections found', resolutionPromise });
          return null;
        }

        return {
          from: fromEvent.name,
          to: toEvent.name,
          type: conn.type,
          description: conn.description
        };
      }).filter(Boolean);

      resolve({
        events: formattedEvents,
        connections: formattedConnections
      });
    });
  };

  const handleAnalyzeTrajectory = async () => {
    setIsAnalyzing(true);
    try {
      // First check for invalid connections
      const formattedData = await formatDataForAnalysis().catch(async (error) => {
        if (error.type === 'Invalid connections found') {
          setIsAnalyzing(false);
          // Wait for the user to resolve the connections
          await error.resolutionPromise;
          // Close the popup
          setShowEditConnectionPopup(false);
          setSelectedConnection(null);
          setInitialConnectionState(null);
          // After resolution, get the formatted data again
          return formatDataForAnalysis();
        }
        throw error;
      });

      // Only proceed with analysis if we have valid data
      const prompt = `Analyze this student's trajectory and suggest potential career paths based on their experiences and connections. 
      Events: ${JSON.stringify(formattedData.events)}
      Connections: ${JSON.stringify(formattedData.connections)}
      Please provide a detailed analysis focusing on:
      1. Key strengths and interests shown through your experiences
      2. Potential career paths that align with your trajectory
      3. Recommendations for your future development
      4. Any notable patterns or themes in your journey
      
      Please write the analysis using second-person pronouns (you, your) to make it more personal and engaging.
      Skip any formalities or introductions - start directly with the analysis. Mark titles with **title**. No colon after titles.`;

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/chatbot/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: prompt })
      });

      if (!response.ok) {
        throw new Error('Failed to get analysis');
      }

      const data = await response.json();
      if (!data || !data.content) {
        throw new Error('Invalid analysis data received');
      }

      // Create new analysis
      const analysis = {
        id: `analysis_${Date.now()}`,
        timestamp: new Date().toISOString(),
        content: data.content
      };

      if (!currentUser || !currentUser.User_ID) {
        throw new Error("No user data found");
      }

      const userData = await userTable.handleRead({ User_ID: currentUser.User_ID }, false);

      if (userData) {
        const updatedAnalyses = [analysis, ...(userData.trajectory_analyses || [])];
        // console.log('Updating analyses:', updatedAnalyses); // Debug log

        const updateResponse = await fetch('/api/auth/me', {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            trajectory_analyses: updatedAnalyses
          })
        });

        if (!updateResponse.ok) {
          throw new Error('Failed to update analyses');
        }

        const updatedUser = await updateResponse.json();
        // console.log('Updated user data:', updatedUser); // Debug log

        // Update local state
        setPastAnalyses(updatedAnalyses);
        setCurrentAnalysis(analysis);
        setShowAnalysisPopup(true);
      }
    } catch (error) {
      console.error('Error analyzing trajectory:', error);
      if (error.type === 'Invalid connections found') {
        return;
      }
      alert('Failed to analyze trajectory. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Calculate number of columns based on screen width
  const getGridColumns = () => {
    if (screenWidth < 1024) return 1; // xs: single column for small screens
    if (screenWidth < 4080) return 2; // m: double column for conventional screens
    return 3; // lg and above: three columns for large screens
  };

  const calculateYearHeight = (year) => {
    let maxEvents = 0;
    eventTypes.forEach(type => {
      const yearEvents = events.filter(e => e.year === year && e.type === type);
      maxEvents = Math.max(maxEvents, yearEvents.length);
    });
    // Each event card takes about 220px height, plus 12px gap
    // Add extra padding for better spacing
    return Math.max(256, Math.ceil(maxEvents / getGridColumns()) * 232 + 32);
  };

  const handleDeleteAnalysis = async (analysisId) => {
    try {
      if (!currentUser || !currentUser.User_ID) {
        throw new Error("No user data found");
      }

      const updatedAnalyses = pastAnalyses.filter(analysis => analysis.id !== analysisId);

      const response = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          trajectory_analyses: updatedAnalyses
        })
      });

      if (!response.ok) {
        throw new Error('Failed to delete analysis');
      }

      setPastAnalyses(updatedAnalyses);
    } catch (error) {
      console.error('Error deleting analysis:', error);
      alert('Failed to delete analysis. Please try again.');
    }
  };

  const handleEventTypeChange = (e) => {
    const value = e.target.value;
    if (value === 'custom') {
      setShowCustomTypePopup(true);
      setNewEvent(prev => ({ ...prev, type: '' }));
      setIsBottomPanelOpen(false);
    } else {
      setNewEvent(prev => ({ ...prev, type: value }));
    }
  };

  // Get language-specific chat messages
  const getChatMessages = () => {
    const currentLanguage = i18n.language || 'en';

    switch (currentLanguage) {
      case 'tc':
        return {
          initialMessage: `我想同愛迪生討論呢個分析：\n\n${currentAnalysis.content}`,
          responsePrompt: "請分析呢個軌跡同埋提供你嘅見解。"
        };
      case 'sc':
        return {
          initialMessage: `嗨！我想和爱迪生讨论这个分析：\n\n${currentAnalysis.content}`,
          responsePrompt: "请分析这个轨迹并提供你的见解。"
        };
      case 'en':
      default:
        return {
          initialMessage: `I'd like to discuss this analysis:\n\n${currentAnalysis.content}`,
          responsePrompt: "Please analyze this trajectory and provide your insights."
        };
    }
  };

  return (
    <div className={`flex ${screenWidth >= 1024 ? 'h-[calc(100vh-4rem)] overflow-hidden' : 'h-screen overflow-hidden'}`}>
      {/* Show loading state while auth is being checked */}
      {isLoading && (
        <div className="flex items-center justify-center h-full w-full">
          <LoadingSpinner size="large" text={t('common.loading')} />
        </div>
      )}

      {/* Show login prompt if not authenticated */}
      {!isLoading && !isAuthenticated && (
        <div className="flex items-center justify-center h-full w-full">
          <div className="text-lg">Please log in to access your trajectory map.</div>
        </div>
      )}

      {/* Show trajectory interface if authenticated */}
      {!isLoading && isAuthenticated && (
        <>
          {/* Left sidebar - only visible on large screens */}
          {screenWidth >= 1024 && (
            <div className="w-80 bg-white border-r border-gray-200 p-4 flex flex-col overflow-y-auto">
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold">{t('trajectory.addEvent')}</h2>
                  <button
                    onClick={() => setShowManageTypesPopup(true)}
                    className="text-sm text-gray-500 hover:text-gray-700"
                    title={t('trajectory.manageEventTypes')}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                </div>
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder={t('trajectory.eventName')}
                    value={newEvent.name}
                    onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                    className="w-full p-2 border rounded"
                  />
                  <div>
                    <input
                      type="number"
                      placeholder={t('trajectory.year')}
                      value={newEvent.year}
                      onChange={handleYearChange}
                      className={`w-full p-2 border rounded ${yearError ? 'border-red-500' : ''}`}
                      min="1900"
                      max={new Date().getFullYear() + 10}
                      step="1"
                    />
                    {yearError && (
                      <p className="text-red-500 text-sm mt-1">{yearError}</p>
                    )}
                  </div>
                  <select
                    value={newEvent.type}
                    onChange={handleEventTypeChange}
                    className="w-full p-2 border rounded"
                  >
                    <option value="">{t('trajectory.selectEventType')}</option>
                    {eventTypes.map(type => (
                      <option key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </option>
                    ))}
                    <option value="custom">{t('trajectory.addNew')}</option>
                  </select>
                  <textarea
                    placeholder={t('trajectory.eventDescription')}
                    value={newEvent.description || ''}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    className="w-full p-2 border rounded h-32"
                  />
                  <button
                    onClick={handleAddEvent}
                    disabled={!isEventValid}
                    className={`w-full p-2 rounded ${isEventValid
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                  >
                    {t('trajectory.addEvent')}
                  </button>
                </div>
              </div>

              {/* Custom Type Popup */}
              {showCustomTypePopup && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white p-6 rounded-lg shadow-lg w-96">
                    <h3 className="text-lg font-semibold mb-4">{t('trajectory.addNewEventType')}</h3>
                    <input
                      type="text"
                      placeholder={t('trajectory.enterNewEventType')}
                      value={customTypeInput}
                      onChange={(e) => setCustomTypeInput(e.target.value)}
                      className="w-full p-2 border rounded mb-4"
                    />
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => {
                          setShowCustomTypePopup(false);
                          setCustomTypeInput('');
                        }}
                        className="px-4 py-2 border rounded hover:bg-gray-100"
                      >
                        {t('common.cancel')}
                      </button>
                      <button
                        onClick={handleCustomTypeSubmit}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        {t('common.addNew')}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Manage Types Popup */}
              {showManageTypesPopup && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{ zIndex: 50 }}>
                  <div className="bg-white p-6 rounded-lg shadow-lg w-96">
                    <h3 className="text-lg font-semibold mb-4">{t('trajectory.manageEventTypes')}</h3>
                    <div className="space-y-2 mb-4">
                      {eventTypes.map(type => {
                        const isDragged = type === draggedType;
                        const isDragOver = type === dragOverType;
                        const draggedIndex = eventTypes.indexOf(draggedType);
                        const currentIndex = eventTypes.indexOf(type);

                        // Calculate shift direction only when actively dragging over
                        const shouldShift = dragOverType && !isDragged && !isDragOver;
                        const shiftDirection = shouldShift ?
                          (currentIndex > draggedIndex && currentIndex <= eventTypes.indexOf(dragOverType) ? -1 :
                            currentIndex < draggedIndex && currentIndex >= eventTypes.indexOf(dragOverType) ? 1 : 0) : 0;

                        return (
                          <div
                            key={type}
                            draggable
                            onDragStart={(e) => handleTypeDragStart(e, type)}
                            onDragOver={(e) => handleTypeDragOver(e, type)}
                            onDragLeave={(e) => handleTypeDragLeave(e, type)}
                            onDrop={(e) => handleTypeDrop(e, type)}
                            className={`flex items-center justify-between p-2 rounded cursor-move transition-all duration-200 ${isDragged ? 'opacity-50 bg-gray-100' :
                              isDragOver ? 'bg-blue-50' :
                                'bg-gray-50 hover:bg-gray-100'
                              }`}
                            style={{
                              transform: isDragged ? 'scale(1.05)' :
                                shouldShift ? `translateY(${shiftDirection * 40}px)` : 'none',
                              transition: 'transform 0.2s ease-out, background-color 0.2s ease-out'
                            }}
                          >
                            <span className="capitalize">{type}</span>
                            <button
                              onClick={() => handleDeleteType(type)}
                              className="text-red-500 hover:text-red-700"
                              title={t('trajectory.deleteType')}
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={() => {
                          setShowManageTypesPopup(false);
                          // Reopen bottom panel after closing manage types popup
                          setIsBottomPanelOpen(true);
                        }}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        {t('common.close')}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <h2 className="text-lg font-semibold mb-4">{t('trajectory.addConnection')}</h2>
                <div className="space-y-4">
                  <select
                    value={newConnection.from}
                    onChange={(e) => setNewConnection({ ...newConnection, from: e.target.value })}
                    className="w-full p-2 border rounded"
                  >
                    <option value="">{t('trajectory.fromEvent')}</option>
                    {events
                      .filter(event => event.id !== newConnection.to)
                      .map((event) => (
                        <option key={event.id} value={event.id}>
                          {event.name}
                        </option>
                      ))}
                  </select>
                  <select
                    value={newConnection.to}
                    onChange={(e) => setNewConnection({ ...newConnection, to: e.target.value })}
                    className="w-full p-2 border rounded"
                  >
                    <option value="">{t('trajectory.toEvent')}</option>
                    {events
                      .filter(event => event.id !== newConnection.from)
                      .map((event) => (
                        <option key={event.id} value={event.id}>
                          {event.name}
                        </option>
                      ))}
                  </select>
                  <select
                    value={newConnection.type}
                    onChange={(e) => setNewConnection({ ...newConnection, type: e.target.value })}
                    className="w-full p-2 border rounded"
                  >
                    <option value="">{t('trajectory.selectConnectionType')}</option>
                    <option value="influenced">{t('trajectory.influenced')}</option>
                    <option value="led_to">{t('trajectory.ledTo')}</option>
                    <option value="related">{t('trajectory.related')}</option>
                  </select>
                  <textarea
                    placeholder={t('trajectory.connectionDescription')}
                    value={newConnection.description || ''}
                    onChange={(e) => setNewConnection({ ...newConnection, description: e.target.value })}
                    className="w-full p-2 border rounded h-32"
                  />
                  <button
                    onClick={handleAddConnection}
                    disabled={!isConnectionValid}
                    className={`w-full p-2 rounded ${isConnectionValid
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                  >
                    {t('common.addConnection')}
                  </button>
                </div>
              </div>

              {/* Analysis buttons */}
              <div className="mt-6 space-y-2">
                <button
                  onClick={() => {
                    handleAnalyzeTrajectory();
                    setIsBottomPanelOpen(false);
                  }}
                  disabled={isAnalyzing}
                  className={`w-full p-2 rounded ${isAnalyzing
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                >
                  {isAnalyzing ? t('common.loading') : t('trajectory.trajectoryAnalysis')}
                </button>
                <button
                  onClick={() => {
                    setShowPastAnalysesPopup(true);
                    setIsBottomPanelOpen(false);
                  }}
                  className="w-full p-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  {t('trajectory.pastAnalyses')}
                </button>
              </div>

              {/* Copyright statement */}
              <div className="mt-auto pt-4 text-center text-xs text-gray-500 border-t border-gray-200">
                © {new Date().getFullYear()} EDVise. All rights reserved.
              </div>
            </div>
          )}

          {/* Main content area */}
          <div className="flex-1 flex flex-col overflow-hidden relative" ref={containerRef} style={{ height: 'calc(100vh - 4rem)' }}>
            {/* Add arrowhead marker definitions */}
            <svg style={{ position: 'absolute', width: 0, height: 0, zIndex: 1 }}>
              <defs>
                <marker
                  id="arrowhead-influenced"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon
                    points="0 0, 10 3.5, 0 7"
                    fill="#3B82F6"
                  />
                </marker>
                <marker
                  id="arrowhead-led_to"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon
                    points="0 0, 10 3.5, 0 7"
                    fill="#10B981"
                  />
                </marker>
                <marker
                  id="arrowhead-related"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon
                    points="0 0, 10 3.5, 0 7"
                    fill="#8B5CF6"
                  />
                </marker>
                <marker
                  id="arrowhead-default"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon
                    points="0 0, 10 3.5, 0 7"
                    fill="#6B7280"
                  />
                </marker>
              </defs>
            </svg>

            {/* Scrollable container for both header and content */}
            <div className="flex-1 overflow-auto scrollbar-auto scrollbar-thumb-gray-300 scrollbar-track-gray-100" style={{ height: 'calc(100vh - 4rem)' }}>
              {/* Timeline header (event types) */}
              <div
                className="flex w-full bg-white z-10 border-b sticky top-0 cursor-grab active:cursor-grabbing select-none"
                style={{ minWidth: 'max-content', width: '100%' }}
                onMouseDown={handleHeaderMouseDown}
                onMouseMove={handleHeaderMouseMove}
                onMouseUp={handleHeaderMouseUp}
                onMouseLeave={handleHeaderMouseUp}
              >
                {/* Empty cell for year legend alignment */}
                <div className="w-16" />
                <div className="flex flex-1">
                  {/* console.log('TrajectoryMap - Rendering header with eventTypes:', eventTypes) */}
                  {eventTypes.map((type, index) => (
                    <div
                      key={type}
                      className="flex-1 py-2 border-b"
                      style={{
                        minWidth: `${300 * getGridColumns()}px`,
                        width: '100%'
                      }}
                    >
                      <h3 className="text-lg font-semibold capitalize text-center">{type}</h3>
                    </div>
                  ))}
                </div>
              </div>

              {/* Timeline content area */}
              <div className="relative" style={{ minWidth: 'max-content', width: '100%', minHeight: 'max-content' }}>
                {/* Render connections only if screen is wide enough */}
                {showConnections && renderConnections()}
                {/* Always show dragline regardless of screen size */}
                {renderDragLine()}

                {/* Timeline grid: each year is a row, each event type is a column */}
                <div className="flex flex-col w-full" style={{ zIndex: 2 }}>
                  {getYears().map((year, rowIdx) => {
                    const yearHeight = calculateYearHeight(year);
                    const rowBgClass = rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50';
                    return (
                      <div key={year} className={`flex w-full border-b border-gray-200 ${rowBgClass}`} style={{ minHeight: `${yearHeight}px` }}>
                        {/* Year legend cell - sticky */}
                        <div
                          className={`w-16 flex items-center justify-center border-r border-gray-200 sticky left-0 ${rowBgClass}`}
                          style={{ minHeight: `${yearHeight}px`, zIndex: 5, padding: '0.5rem' }}
                        >
                          <span className="text-gray-500 font-medium">{year}</span>
                        </div>
                        {/* Event type columns for this year */}
                        <div className="flex w-full">
                          {/* console.log('TrajectoryMap - Rendering grid columns with eventTypes:', eventTypes) */}
                          {eventTypes.map((type, index) => {
                            const yearEvents = sortEventsTopologically(
                              events.filter(e => e.year === year && e.type === type),
                              connections
                            );
                            return (
                              <div
                                key={type}
                                className={`w-full px-2 py-2 grid gap-x-6 gap-y-3 justify-items-center min-w-[280px] ${index < eventTypes.length - 1 ? 'border-r' : ''}`}
                                style={{
                                  minHeight: `${yearHeight}px`,
                                  minWidth: `${300 * getGridColumns()}px`,
                                  width: '100%',
                                  display: 'grid',
                                  gridTemplateColumns: `repeat(${getGridColumns()}, 1fr)`,
                                  gridAutoFlow: 'row'
                                }}
                              >
                                {yearEvents.map((event) => (
                                  <div
                                    key={event.id}
                                    ref={el => eventRefs.current.set(event.id, el)}
                                    onClick={() => handleEventClick(event)}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      handleConnectionDragStart(event);
                                    }}
                                    className={`bg-white rounded-lg shadow-md p-4 border ${getTypeBorderColor(
                                      event.type
                                    )} group cursor-pointer hover:shadow-lg transition-shadow w-[280px] max-h-[220px] flex flex-col relative select-none`}
                                    style={{ boxSizing: 'border-box', zIndex: 4 }}
                                  >
                                    {/* Event card content */}
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <h3 className="font-semibold">{event.name}</h3>
                                        <p className="text-sm text-gray-500">{event.year}</p>
                                        {event.description && (
                                          <p className="mt-2 text-sm text-gray-600 line-clamp-2">{event.description}</p>
                                        )}
                                      </div>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteEvent(event.id);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700"
                                        title={t('trajectory.deleteEvent')}
                                      >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      </button>
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleConnectionsClick(event);
                                      }}
                                      className="mt-2 w-full py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium text-gray-700 flex items-center justify-center"
                                    >
                                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                      </svg>
                                      {getEventConnections(event.id).length} {getEventConnections(event.id).length === 1 ? t('common.connection') : t('common.connections')}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Edit Event Popup */}
          {showEditEventPopup && selectedEvent && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{ zIndex: 50, position: 'fixed', pointerEvents: 'auto' }}>
              <div className="bg-white p-6 rounded-lg shadow-lg w-96" style={{ position: 'relative' }}>
                <h3 className="text-lg font-semibold mb-4">{t('trajectory.editEvent')}</h3>
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder={t('trajectory.eventName')}
                    value={selectedEvent.name}
                    onChange={(e) => setSelectedEvent({ ...selectedEvent, name: e.target.value })}
                    className="w-full p-2 border rounded"
                  />
                  <div>
                    <input
                      type="number"
                      placeholder={t('trajectory.year')}
                      value={selectedEvent.year}
                      onChange={(e) => {
                        const year = parseInt(e.target.value);
                        const error = validateYear(year);
                        setYearError(error);
                        setIsYearValid(!error);
                        setSelectedEvent({ ...selectedEvent, year });
                      }}
                      className={`w-full p-2 border rounded ${yearError ? 'border-red-500' : ''}`}
                      min="1900"
                      max={new Date().getFullYear() + 10}
                      step="1"
                    />
                    {yearError && (
                      <p className="text-red-500 text-sm mt-1">{yearError}</p>
                    )}
                  </div>
                  <select
                    value={selectedEvent.type}
                    onChange={(e) => setSelectedEvent({ ...selectedEvent, type: e.target.value })}
                    className="w-full p-2 border rounded"
                  >
                    {eventTypes.map(type => (
                      <option key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </option>
                    ))}
                  </select>
                  <textarea
                    placeholder={t('trajectory.eventDescription')}
                    value={selectedEvent.description || ''}
                    onChange={(e) => setSelectedEvent({ ...selectedEvent, description: e.target.value })}
                    className="w-full p-2 border rounded h-32"
                  />
                  <div className="flex justify-between">
                    <button
                      onClick={() => handleDeleteEvent(selectedEvent.id)}
                      className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      {t('common.delete')}
                    </button>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setShowEditEventPopup(false)}
                        className="px-4 py-2 border rounded hover:bg-gray-100"
                      >
                        {hasEventChanged() ? t('common.cancel') : t('common.close')}
                      </button>
                      <button
                        onClick={handleUpdateEvent}
                        disabled={!isYearValid}
                        className={`px-4 py-2 rounded ${isYearValid
                          ? 'bg-blue-500 text-white hover:bg-blue-600'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                      >
                        {t('common.save')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Edit Connection Popup */}
          {showEditConnectionPopup && selectedConnection && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{ zIndex: 50, position: 'fixed', pointerEvents: 'auto' }}>
              <div className="bg-white p-6 rounded-lg shadow-lg w-96" style={{ position: 'relative' }}>
                <h3 className="text-lg font-semibold mb-4">{t('trajectory.editConnection')}</h3>
                {selectedConnection.hasMissingEvents && (
                  <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 rounded text-yellow-700">
                    <p className="text-sm">{t('common.oneOrBothEventsNotFound')}</p>
                  </div>
                )}
                <div className="space-y-4">
                  <select
                    value={selectedConnection.from}
                    onChange={(e) => setSelectedConnection({ ...selectedConnection, from: e.target.value })}
                    className="w-full p-2 border rounded"
                  >
                    <option value="">{t('trajectory.fromEvent')}</option>
                    {events
                      .filter(event => event.id !== selectedConnection.to)
                      .map((event) => (
                        <option key={event.id} value={event.id}>
                          {event.name}
                        </option>
                      ))}
                  </select>
                  <select
                    value={selectedConnection.to}
                    onChange={(e) => setSelectedConnection({ ...selectedConnection, to: e.target.value })}
                    className="w-full p-2 border rounded"
                  >
                    <option value="">{t('trajectory.toEvent')}</option>
                    {events
                      .filter(event => event.id !== selectedConnection.from)
                      .map((event) => (
                        <option key={event.id} value={event.id}>
                          {event.name}
                        </option>
                      ))}
                  </select>
                  <select
                    value={selectedConnection.type}
                    onChange={(e) => setSelectedConnection({ ...selectedConnection, type: e.target.value })}
                    className="w-full p-2 border rounded"
                  >
                    <option value="influenced">{t('trajectory.influenced')}</option>
                    <option value="led_to">{t('trajectory.ledTo')}</option>
                    <option value="related">{t('trajectory.related')}</option>
                  </select>
                  <textarea
                    placeholder={t('trajectory.connectionDescription')}
                    value={selectedConnection.description || ''}
                    onChange={(e) => setSelectedConnection({ ...selectedConnection, description: e.target.value })}
                    className="w-full p-2 border rounded h-32"
                  />
                  <div className="flex justify-between">
                    <button
                      onClick={() => handleDeleteConnection(selectedConnection.id)}
                      className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      {t('common.delete')}
                    </button>
                    <div className="flex space-x-2">
                      <button
                        onClick={handleCloseEditConnectionPopup}
                        className="px-4 py-2 border rounded hover:bg-gray-100"
                      >
                        {hasConnectionChanged() ? t('common.cancel') : t('common.close')}
                      </button>
                      <button
                        onClick={handleUpdateConnection}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        {t('common.save')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Connections Popup */}
          {showConnectionsPopup && selectedEvent && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{ zIndex: 50, position: 'fixed', pointerEvents: 'auto' }}>
              <div className="bg-white p-6 rounded-lg shadow-lg w-96 max-h-[80vh] flex flex-col" style={{ position: 'relative' }}>
                <h3 className="text-lg font-semibold mb-4">{t('trajectory.connectionsFor', { eventName: selectedEvent.name })}</h3>
                <div className="flex-1 overflow-y-auto mb-4">
                  {selectedEventConnections.length === 0 ? (
                    <p className="text-gray-500 text-center">{t('common.noConnectionsFound')}</p>
                  ) : (
                    <div className="space-y-3">
                      {selectedEventConnections.map((connection) => {
                        const fromEvent = events.find(e => e.id === connection.from);
                        const toEvent = events.find(e => e.id === connection.to);
                        return (
                          <div
                            key={connection.id}
                            className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                            onClick={() => {
                              setSelectedConnection(connection);
                              setShowEditConnectionPopup(true);
                              setShowConnectionsPopup(false);
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">
                                  {fromEvent.name} → {toEvent.name}
                                </p>
                                <p className="text-sm text-gray-500 capitalize">{connection.type}</p>
                                {connection.description && (
                                  <p className="text-sm text-gray-600 mt-1">{connection.description}</p>
                                )}
                              </div>
                              <div className={`w-3 h-3 rounded-full ${getConnectionColor(connection.type)}`} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowConnectionsPopup(false)}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    {t('common.close')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Analysis Popup */}
          {showAnalysisPopup && currentAnalysis && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{ zIndex: 50, position: 'fixed', pointerEvents: 'auto' }}>
              <div className="bg-white p-6 rounded-lg shadow-lg w-3/4 max-h-[80vh] flex flex-col" style={{ position: 'relative' }}>
                <h3 className="text-lg font-semibold mb-4">{t('trajectory.trajectoryAnalysis')}</h3>
                <div className="flex-1 overflow-y-auto mb-4">
                  <div className="prose max-w-none">
                    {renderMarkdown(currentAnalysis.content, {
                      isBot: true,
                      showFullContent: true
                    })}
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  {openedFromPastAnalyses && (
                    <button
                      onClick={() => {
                        setShowAnalysisPopup(false);
                        setShowPastAnalysesPopup(true);
                        setOpenedFromPastAnalyses(false);
                      }}
                      className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                      {t('trajectory.returnToList')}
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      try {
                        setCreatingChat(true);
                        const token = localStorage.getItem('token');
                        if (!token) {
                          throw new Error('No authentication token found');
                        }

                        const chatMessages = getChatMessages();

                        // Create a new chat
                        const chatResponse = await fetch('/api/chat/create', {
                          method: 'POST',
                          headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                          },
                          body: JSON.stringify({
                            User_ID: currentUser.User_ID,
                            initial_message: chatMessages.initialMessage
                          })
                        });

                        if (!chatResponse.ok) {
                          throw new Error('Failed to create chat');
                        }

                        const chatData = await chatResponse.json();

                        // Generate initial response from chatbot
                        const messageResponse = await fetch(`/api/chat/${chatData.Chat_ID}/message`, {
                          method: 'POST',
                          headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                          },
                          body: JSON.stringify({
                            Text: chatMessages.responsePrompt,
                            reference_analysis_id: currentAnalysis.id
                          })
                        });

                        if (!messageResponse.ok) {
                          throw new Error('Failed to get chatbot response');
                        }

                        navigate('/eddy', { state: { chatId: chatData.Chat_ID } });
                      } catch (error) {
                        console.error('Error creating chat:', error);
                        alert('Failed to start chat. Please try again.');
                      } finally {
                        setCreatingChat(false);
                      }
                    }}
                    className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    disabled={isCreatingChat}
                  >
                    {isCreatingChat ? 'Creating chat...' : t('trajectory.askEddy')}
                  </button>
                  <button
                    onClick={() => {
                      setShowAnalysisPopup(false);
                      setOpenedFromPastAnalyses(false);
                    }}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    {t('common.close')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Past Analyses Popup */}
          {showPastAnalysesPopup && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{ zIndex: 50, position: 'fixed', pointerEvents: 'auto' }}>
              <div className="bg-white p-6 rounded-lg shadow-lg w-3/4 max-h-[80vh] flex flex-col" style={{ position: 'relative' }}>
                <h3 className="text-lg font-semibold mb-4">{t('trajectory.pastAnalyses')}</h3>
                <div className="flex-1 overflow-y-auto mb-4">
                  {pastAnalyses.length === 0 ? (
                    <p className="text-gray-500 text-center">{t('common.noPastAnalysesAvailable')}</p>
                  ) : (
                    <div className="space-y-4">
                      {pastAnalyses.map(analysis => (
                        <div
                          key={analysis.id}
                          className="p-4 border rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <p className="font-medium text-gray-700">
                              {t('trajectory.analysisFrom', { date: new Date(analysis.timestamp).toLocaleString() })}
                            </p>
                            <button
                              onClick={() => handleDeleteAnalysis(analysis.id)}
                              className="text-red-500 hover:text-red-700 p-1"
                              title={t('common.deleteAnalysis')}
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                          <div
                            className="prose max-w-none cursor-pointer"
                            onClick={() => {
                              setCurrentAnalysis(analysis);
                              setShowAnalysisPopup(true);
                              setShowPastAnalysesPopup(false);
                              setOpenedFromPastAnalyses(true);
                            }}
                          >
                            {renderMarkdown(analysis.content, {
                              isBot: true,
                              charLimit: 500
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowPastAnalysesPopup(false)}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    {t('common.close')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Bottom panel for mobile */}
          {screenWidth < 1024 && (
            <div
              className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 transition-all duration-300 shadow-lg"
              style={{
                height: `${panelHeight}px`,
                transform: `translateY(${isBottomPanelOpen ? 0 : panelHeight - 40}px)`,
                transition: dragStartY === null ? 'transform 0.3s ease-out' : 'none',
                zIndex: 30
              }}
            >
              {/* Drag handle */}
              <div
                className="h-8 flex items-center justify-center cursor-grab active:cursor-grabbing bg-gray-50 touch-none select-none drag-handle"
                onMouseDown={handleDragStart}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{ touchAction: 'none' }}
              >
                <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
              </div>

              {/* Panel content */}
              <div className="overflow-y-auto h-[calc(100%-32px)] p-4">
                {isBottomPanelOpen ? (
                  <>
                    {/* Full control panel content */}
                    <div className="space-y-6">
                      {/* Add Event Section */}
                      <div>
                        <div className="flex justify-between items-center mb-4">
                          <h2 className="text-lg font-semibold">{t('trajectory.addEvent')}</h2>
                          <button
                            onClick={() => {
                              setShowManageTypesPopup(true);
                              setIsBottomPanelOpen(false);
                            }}
                            className="text-sm text-gray-500 hover:text-gray-700"
                            title={t('common.manageEventTypes')}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </button>
                        </div>
                        <div className="space-y-4">
                          <input
                            type="text"
                            placeholder={t('trajectory.eventName')}
                            value={newEvent.name}
                            onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                            className="w-full p-2 border rounded"
                          />
                          <div>
                            <input
                              type="number"
                              placeholder={t('trajectory.year')}
                              value={newEvent.year}
                              onChange={handleYearChange}
                              className={`w-full p-2 border rounded ${yearError ? 'border-red-500' : ''}`}
                              min="1900"
                              max={new Date().getFullYear() + 10}
                              step="1"
                            />
                            {yearError && (
                              <p className="text-red-500 text-sm mt-1">{yearError}</p>
                            )}
                          </div>
                          <select
                            value={newEvent.type}
                            onChange={handleEventTypeChange}
                            className="w-full p-2 border rounded"
                          >
                            <option value="">{t('trajectory.selectEventType')}</option>
                            {eventTypes.map(type => (
                              <option key={type} value={type}>
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                              </option>
                            ))}
                            <option value="custom">{t('common.addNew')}</option>
                          </select>
                          <textarea
                            placeholder={t('common.eventDescription')}
                            value={newEvent.description || ''}
                            onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                            className="w-full p-2 border rounded h-32"
                          />
                          <button
                            onClick={handleAddEvent}
                            disabled={!isEventValid}
                            className={`w-full p-2 rounded ${isEventValid
                              ? 'bg-blue-500 text-white hover:bg-blue-600'
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              }`}
                          >
                            {t('trajectory.addEvent')}
                          </button>
                        </div>
                      </div>

                      {/* Add Connection Section */}
                      <div>
                        <h2 className="text-lg font-semibold mb-4">{t('common.addConnection')}</h2>
                        <div className="space-y-4">
                          <select
                            value={newConnection.from}
                            onChange={(e) => setNewConnection({ ...newConnection, from: e.target.value })}
                            className="w-full p-2 border rounded"
                          >
                            <option value="">{t('trajectory.fromEvent')}</option>
                            {events
                              .filter(event => event.id !== newConnection.to)
                              .map((event) => (
                                <option key={event.id} value={event.id}>
                                  {event.name}
                                </option>
                              ))}
                          </select>
                          <select
                            value={newConnection.to}
                            onChange={(e) => setNewConnection({ ...newConnection, to: e.target.value })}
                            className="w-full p-2 border rounded"
                          >
                            <option value="">{t('trajectory.toEvent')}</option>
                            {events
                              .filter(event => event.id !== newConnection.from)
                              .map((event) => (
                                <option key={event.id} value={event.id}>
                                  {event.name}
                                </option>
                              ))}
                          </select>
                          <select
                            value={newConnection.type}
                            onChange={(e) => setNewConnection({ ...newConnection, type: e.target.value })}
                            className="w-full p-2 border rounded"
                          >
                            <option value="">{t('common.selectConnectionType')}</option>
                            <option value="influenced">{t('trajectory.influenced')}</option>
                            <option value="led_to">{t('trajectory.ledTo')}</option>
                            <option value="related">{t('trajectory.related')}</option>
                          </select>
                          <textarea
                            placeholder={t('common.connectionDescription')}
                            value={newConnection.description || ''}
                            onChange={(e) => setNewConnection({ ...newConnection, description: e.target.value })}
                            className="w-full p-2 border rounded h-32"
                          />
                          <button
                            onClick={handleAddConnection}
                            disabled={!isConnectionValid}
                            className={`w-full p-2 rounded ${isConnectionValid
                              ? 'bg-blue-500 text-white hover:bg-blue-600'
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              }`}
                          >
                            {t('common.addConnection')}
                          </button>
                        </div>
                      </div>

                      {/* Analysis buttons */}
                      <div className="space-y-2">
                        <button
                          onClick={() => {
                            handleAnalyzeTrajectory();
                            setIsBottomPanelOpen(false);
                          }}
                          disabled={isAnalyzing}
                          className={`w-full p-2 rounded ${isAnalyzing
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-blue-500 text-white hover:bg-blue-600'
                            }`}
                        >
                          {isAnalyzing ? t('common.loading') : t('trajectory.trajectoryAnalysis')}
                        </button>
                        <button
                          onClick={() => {
                            setShowPastAnalysesPopup(true);
                            setIsBottomPanelOpen(false);
                          }}
                          className="w-full p-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                        >
                          {t('trajectory.pastAnalyses')}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-center space-x-2">
                    <button
                      onClick={() => {
                        handleAnalyzeTrajectory();
                        setIsBottomPanelOpen(false);
                      }}
                      disabled={isAnalyzing}
                      className={`flex-1 p-2 rounded ${isAnalyzing
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                        }`}
                    >
                      {isAnalyzing ? t('common.loading') : 'Analyze'}
                    </button>
                    <button
                      onClick={() => {
                        setShowPastAnalysesPopup(true);
                        setIsBottomPanelOpen(false);
                      }}
                      className="flex-1 p-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                      {t('trajectory.pastAnalyses')}
                    </button>
                    <button
                      onClick={() => {
                        setShowManageTypesPopup(true);
                        setIsBottomPanelOpen(false);
                      }}
                      className="flex-1 p-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                      title={t('common.manageEventTypes')}
                    >
                      <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Custom Type Popup */}
          {showCustomTypePopup && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{ zIndex: 50, position: 'fixed', pointerEvents: 'auto' }}>
              <div className="bg-white p-6 rounded-lg shadow-lg w-96" style={{ position: 'relative' }}>
                <h3 className="text-lg font-semibold mb-4">{t('common.addNewEventType')}</h3>
                <input
                  type="text"
                  placeholder={t('common.enterNewEventType')}
                  value={customTypeInput}
                  onChange={(e) => setCustomTypeInput(e.target.value)}
                  className="w-full p-2 border rounded mb-4"
                />
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => {
                      setShowCustomTypePopup(false);
                      setCustomTypeInput('');
                      setIsBottomPanelOpen(true);
                    }}
                    className="px-4 py-2 border rounded hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      handleCustomTypeSubmit();
                      setIsBottomPanelOpen(true);
                    }}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Manage Types Popup */}
          {showManageTypesPopup && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{ zIndex: 50, position: 'fixed', pointerEvents: 'auto' }}>
              <div className="bg-white p-6 rounded-lg shadow-lg w-96" style={{ position: 'relative' }}>
                <h3 className="text-lg font-semibold mb-4">{t('common.manageEventTypes')}</h3>
                <div className="space-y-2 mb-4">
                  {eventTypes.map(type => {
                    const isDragged = type === draggedType;
                    const isDragOver = type === dragOverType;
                    const draggedIndex = eventTypes.indexOf(draggedType);
                    const currentIndex = eventTypes.indexOf(type);

                    // Calculate shift direction only when actively dragging over
                    const shouldShift = dragOverType && !isDragged && !isDragOver;
                    const shiftDirection = shouldShift ?
                      (currentIndex > draggedIndex && currentIndex <= eventTypes.indexOf(dragOverType) ? -1 :
                        currentIndex < draggedIndex && currentIndex >= eventTypes.indexOf(dragOverType) ? 1 : 0) : 0;

                    return (
                      <div
                        key={type}
                        draggable
                        onDragStart={(e) => handleTypeDragStart(e, type)}
                        onDragOver={(e) => handleTypeDragOver(e, type)}
                        onDragLeave={(e) => handleTypeDragLeave(e, type)}
                        onDrop={(e) => handleTypeDrop(e, type)}
                        className={`flex items-center justify-between p-2 rounded cursor-move transition-all duration-200 ${isDragged ? 'opacity-50 bg-gray-100' :
                          isDragOver ? 'bg-blue-50' :
                            'bg-gray-50 hover:bg-gray-100'
                          }`}
                        style={{
                          transform: isDragged ? 'scale(1.05)' :
                            shouldShift ? `translateY(${shiftDirection * 40}px)` : 'none',
                          transition: 'transform 0.2s ease-out, background-color 0.2s ease-out'
                        }}
                      >
                        <span className="capitalize">{type}</span>
                        <button
                          onClick={() => handleDeleteType(type)}
                          className="text-red-500 hover:text-red-700"
                          title={t('common.deleteType')}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setShowManageTypesPopup(false);
                      setIsBottomPanelOpen(true);
                    }}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    {t('common.close')}
                  </button>
                </div>
              </div>
            </div>
          )}
          {isCreatingChat && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full mx-4">
                <div className="flex flex-col items-center">
                  <LoadingSpinner size="large" className="mb-4" />
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">Creating Your Chat</h3>
                  <p className="text-gray-600 text-center">Please wait while we set up your conversation with Eddy...</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default TrajectoryMap; 
