# READ

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant BE as Backend Route (Express)
    participant Service as Service Layer
    participant DB as PostgreSQL
    participant User as User (Browser)

    FE->>BE: PUT /api/resources/:id {updatedData}
    BE->>Service: updateResource(id, updatedData)
    Service->>DB: UPDATE resources SET ... WHERE id = :id

    alt DB error
        DB-->>Service: error
        Service-->>BE: 500 Internal Server Error
        BE-->>FE: 500 + error message
        FE-->>User: Show error alert
    else Success
        DB-->>Service: Success
        Service-->>BE: 200 OK {updatedResource}
        BE-->>FE: JSON updated resource
        FE-->>User: Show updated data
    end
```

# UPDATE

```mermaid
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
    DB-->>Service: Result

    alt Success
        Service-->>BE: 200 OK {updatedResource}
        BE-->>FE: JSON updated resource
        FE-->>User: Show updated data
    else Resource not found
        Service-->>BE: 404 Not Found
        BE-->>FE: 404 + error message
        FE-->>User: Show alert "Resource not found"
    end
```    

# DELETE

```mermaid
sequenceDiagram
    participant User as User (Browser)
    participant FE as Frontend (resources.js / list.js)
    participant BE as Backend Route (Express)
    participant Service as Service Layer
    participant DB as PostgreSQL

    User->>FE: Click "Delete" on resource
    FE->>BE: DELETE /api/resources/:id
    BE->>Service: deleteResource(id)
    Service->>DB: DELETE FROM resources WHERE id = :id
    DB-->>Service: Result

    alt Success
        Service-->>BE: 204 No Content
        BE-->>FE: 204
        FE-->>User: Remove item from UI
    else Resource not found
        Service-->>BE: 404 Not Found
        BE-->>FE: 404 + error message
        FE-->>User: Show alert "Resource not found"
    end
