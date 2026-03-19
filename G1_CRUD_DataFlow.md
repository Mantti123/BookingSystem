sequenceDiagram
    participant User as User (Browser)
    participant FE as Frontend (resources.js / form.js)
    participant BE as Backend Route (Express)
    participant Service as Service Layer
    participant DB as PostgreSQL

    User->>FE: Edit resource form + click "Update"
    FE->>BE: PUT /api/resources/:id {updatedData}
    BE->>Service: validate & updateResource(id, updatedData)
    Service->>DB: UPDATE resources SET ... WHERE id = :id
    DB-->>Service: Success
    Service-->>BE: 200 OK {updatedResource}
    BE-->>FE: JSON updated resource
    FE-->>User: Show updated data
