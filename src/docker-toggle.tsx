import { ActionPanel, List, Action, Icon, Color } from '@raycast/api'
import { getRunningProjects, Project, State, toggleProject } from './utils/docker'
import { useEffect, useState } from 'react'


const stateIcon = (state: State, isToggling: boolean) => {
  if (isToggling) return 'loading.gif'
  switch (state) {
    case State.RUNNING:
      return {source: Icon.CircleFilled, tintColor: Color.Green}
    case State.STOPPED:
      return {source: Icon.Circle}
    default:
      return {source: Icon.Circle, tintColor: Color.Orange}
  }
}

export default function Command() {

  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)

  const updateProjects = () => {
    getRunningProjects().then(setProjects)
  }

  useEffect(() => {
    updateProjects()
  }, [])
  const handleToggleProject = (project: Project) => {
    setLoading(true)
    toggleProject(project).finally(() => {
      updateProjects()
      setLoading(false)
    })
  }
  return (
    <List isLoading={loading}>
      {projects.map(project =>
        <List.Item
          key={project.name}
          icon={stateIcon(project.status(), project.isToggling)}
          title={project.name}
          actions={
            <ActionPanel>
              <Action title="Toggle Project" onAction={() => handleToggleProject(project)} icon={Icon.Switch} />
              <Action.Push title="Show Containers" icon={Icon.Eye} target={
                <List isLoading={loading}>
                  {project.containers.map(container =>
                    <List.Item
                      key={container.id}
                      title={container.name}
                      icon={stateIcon(container.status, container.isToggling)}
                    />
                  )}
                </List>
              } />
            </ActionPanel>
          }
        />
      )}
    </List>
  )
}
