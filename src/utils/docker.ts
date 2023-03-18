import Docker from '@priithaamer/dockerode'
import { firstBy } from 'thenby'

const docker = new Docker({socketPath: '/var/run/docker.sock'})

export enum State {
  RUNNING,
  ERROR,
  STOPPED
}

export class Project {
  readonly name: string
  containers: Container[] = []
  isToggling = false

  constructor(name: string) {
    this.name = name
  }

  status(): State {
    if (this.containers.every(container => container.isRunning())){
      return State.RUNNING
    } else if (this.containers.some(container =>container.isRunning())) {
      return State.ERROR
    } else {
      return State.STOPPED
    }
  }
}


export class Container {
  readonly id: string
  readonly name: string
  status: State = State.STOPPED
  isToggling = false

  constructor(id: string, name: string, status: State) {
    this.id = id
    this.name = name
    this.status = status
  }
  isRunning(): boolean {
    return this.status === State.RUNNING
  }
}

function matchState(status: string): State {
  switch (status) {
    case 'running':
      return State.RUNNING
    case'exited':
      return State.STOPPED
    case 'error':
      return State.ERROR
    default:
      return State.ERROR
  }
}
export async function getRunningProjects(): Promise<Project[]> {
  const containers = await docker.listContainers({all: true})
  const projects: Project[] = []

  for (const cnt of containers) {
    const container = new Container(cnt.Id, cnt.Names[0], matchState(cnt.State))
    const projectName = cnt.Labels['com.docker.compose.project']

    const project = projects.find(project => project.name === projectName)
    if (!project) {
      const project = new Project(projectName)
      project.containers.push(container)
      projects.push(project)
    } else{
      project.containers.push(container)
    }
  }

  return projects.sort(
    firstBy((a: Project, b: Project) => a.status() - b.status())
      .thenBy('name')
  )
}

export async function toggleProject(project: Project): Promise<boolean> {
  let result = true
  project.isToggling = true
  for (const container of project.containers) {
    const forceStop = project.status() === State.ERROR
    if (!await toggleContainer(container, forceStop)){
      result = false
    }
  }
  project.isToggling = false
  return result
}

export async function toggleContainer(container: Container, forceStop = false): Promise<boolean> {
  let result = false
  const cnt = docker.getContainer(container.id)

  if (container.status === State.RUNNING || container.status === State.ERROR || forceStop) {
    try {
      container.isToggling = true
      await cnt.stop()
      container.isToggling = false
    } catch (err) {
      result = false
    }
  } else {
    try {
      container.isToggling = true
      await cnt.start()
      container.isToggling = false
    } catch (err) {
      result = false
    }
  }
  return result
}
