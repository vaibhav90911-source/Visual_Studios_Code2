import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { subscribeToRecordings, type Recording } from "@/lib/recordings";
import { isAssignedToUser, triggerAssignmentNotification } from "@/lib/staff-assignment";

export function AssignmentNotificationListener() {
  const { user } = useAuth();
  const initialMountRef = useRef(true);
  const knownAssignmentsRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!user) return;

    // Track existing recordings on initial load to avoid chime storms when refreshing
    const unsubscribe = subscribeToRecordings((recordings: Recording[]) => {
      if (initialMountRef.current) {
        // Record initial state
        recordings.forEach((r) => {
          knownAssignmentsRef.current.set(r.id, r.assigned_to || "");
        });
        initialMountRef.current = false;
        return;
      }

      // Check for newly assigned recordings or assignment changes
      for (const rec of recordings) {
        const prevAssigned = knownAssignmentsRef.current.get(rec.id);
        const currentAssigned = rec.assigned_to || "";

        // If this recording is assigned to current user and either it's new or the assignment changed
        if (
          isAssignedToUser(currentAssigned, user) &&
          (!prevAssigned || prevAssigned !== currentAssigned)
        ) {
          triggerAssignmentNotification(rec);
        }

        knownAssignmentsRef.current.set(rec.id, currentAssigned);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  return null;
}
